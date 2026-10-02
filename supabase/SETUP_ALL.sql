-- ════════════════════════════════════════════════════════════════════════
-- IDEOVENT: THE WHOLE DATABASE IN ONE PASTE
-- Supabase > SQL Editor > New query > paste all of this > Run.
-- It is migrations 0001 to 0011 in order. Every statement is safe to run
-- again, so if anything errors halfway, fix it and run the whole file again.
-- Before running: check the admin email in the 0005 section (search for
-- 'your /admin login email').
-- Generated from supabase/migrations/. Edit those, not this.
-- ════════════════════════════════════════════════════════════════════════



-- ┌──────────────────────────── 0001_content.sql ────────────────────────────┐

-- Ideovent Technologies: Supabase schema
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


-- ┌──────────────────────────── 0002_certificate_grades.sql ────────────────────────────┐

-- Ideovent Technologies: make intern rubric grades admin-only
--
-- WHY THIS EXISTS
-- ---------------
-- Until 24 Sep 2026 the numeric rubric total of every certified intern was a field
-- on the certificate record itself. `certificates` is public by design: the whole
-- point of /verify/<id> is that a stranger can read it without an account: so the
-- rubric total of two real, named private individuals was readable by
-- anyone who opened the page, fetched public/certificates.json, or read the JS
-- bundle. Mehdi confirmed on 24 Sep 2026 that the numeric grade comes off the
-- public view.
--
-- Hiding the row in the React component would have fixed none of that: the value
-- was still in the payload. So the grade moved to its OWN collection, and this
-- migration is the half of that move that the browser cannot argue with: the
-- `anon` role simply gets no rows back for it.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) AFTER 0001.
-- Re-running it is safe.

-- ── Read ──────────────────────────────────────────────
-- Replaces the policy created in 0001. `certificateGrades` joins the two lead
-- collections on the list of things anonymous visitors may not select.
-- Keep this list identical to PRIVATE_COLLECTIONS in src/lib/cms/types.ts.
drop policy if exists "read public content" on public.content;
create policy "read public content" on public.content
  for select
  using (collection not in ('submissions', 'applications', 'certificateGrades'));

-- "read all authed" from 0001 is unchanged: a signed-in admin still reads
-- everything, which is what /admin → Certificates needs in order to show the
-- grade field at all.

-- ── Belt and braces ───────────────────────────────────
-- If a grade is ever written back onto a certificate document by an older build
-- or a hand-edited import, strip it. A certificate row is public; a grade is not.
update public.content
   set data = data - 'grade'
 where collection = 'certificates'
   and data ? 'grade';

-- Verification. Both of these should return zero rows.
--
--   set role anon;
--   select count(*) from public.content where collection = 'certificateGrades';
--   select count(*) from public.content where collection = 'certificates' and data ? 'grade';
--   reset role;


-- ┌──────────────────────────── 0003_pitch_pages.sql ────────────────────────────┐

-- Ideovent Technologies, pitch pages, and keeping their internal notes private
--
-- WHY THIS EXISTS
-- ---------------
-- A pitch page is a landing page written for ONE named institute and served at
-- ideovent.vercel.app/<their-name>. The record has to be readable by `anon`,
-- because the whole point is that the director opens the link without an
-- account. So `pitchPages` is public content, like `projects` and `posts`, and
-- the record type is shaped around that: it carries no phone number, no email
-- and no postal address for the institute, and it must not grow one. See
-- PitchPage in src/lib/cms/types.ts.
--
-- What is NOT public is the note beside it. "Chasing them, they sounded
-- desperate, push the portal" is the sort of thing somebody writes in an
-- internal note, and on a world-readable record it would be one View Source
-- away from the person it is about. Hiding it in the React component fixes
-- nothing: the value would still be in the payload. So the note lives in its
-- own collection, `pitchPageNotes`, and this migration is the half of that
-- the browser cannot argue with: `anon` simply gets no rows back for it.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) AFTER 0002.
-- Re-running it is safe.

-- ── Read ──────────────────────────────────────────────
-- Replaces the policy last written by 0002. `pitchPageNotes` joins the list of
-- collections anonymous visitors may not select.
-- Keep this list identical to PRIVATE_COLLECTIONS in src/lib/cms/types.ts.
drop policy if exists "read public content" on public.content;
create policy "read public content" on public.content
  for select
  using (collection not in ('submissions', 'applications', 'certificateGrades', 'pitchPageNotes'));

-- "read all authed" from 0001 is unchanged: a signed-in admin still reads
-- everything, which is what /admin → Pitch pages needs in order to show the
-- note field at all.
--
-- Writes are unchanged too. 0001 already lets `anon` insert ONLY into
-- 'submissions' and 'applications', so a visitor cannot create or edit a pitch
-- page, and an authenticated admin can do all of it.

-- ── Belt and braces ───────────────────────────────────
-- If a note is ever written back onto a pitch page document by an older build
-- or a hand-edited import, strip it. The page record is public; the note is not.
update public.content
   set data = data - 'notes' - 'internalNotes' - 'note'
 where collection = 'pitchPages'
   and (data ? 'notes' or data ? 'internalNotes' or data ? 'note');

-- Same for contact details. There has never been a field for these, and the
-- reason is in FACTS.md: an invented number belongs to a real stranger who
-- then gets the call, and anything stored here is published. If one appears,
-- it came from an import or a build that should not have had it.
update public.content
   set data = data - 'phone' - 'email' - 'whatsapp' - 'address' - 'contact'
 where collection = 'pitchPages'
   and (data ? 'phone' or data ? 'email' or data ? 'whatsapp'
        or data ? 'address' or data ? 'contact');

-- Verification. All of these should return zero rows.
--
--   set role anon;
--   select count(*) from public.content where collection = 'pitchPageNotes';
--   select count(*) from public.content
--    where collection = 'pitchPages'
--      and (data ? 'notes' or data ? 'phone' or data ? 'email' or data ? 'contact');
--   reset role;
--
-- And this one should return the live pitch pages, which is correct:
--   set role anon;
--   select data->>'slug', data->>'status' from public.content where collection = 'pitchPages';
--   reset role;
--
-- A DRAFT pitch page IS readable by anon at the database level, and that is a
-- deliberate limit of a single-table public content store: the status gate is
-- in resolvePitchPage(), so a draft renders the 404 rather than the page. It is
-- not a secret-keeping mechanism. Do not put anything in a draft record that
-- would matter if it were read. The note field, which is the one place that
-- would, is why `pitchPageNotes` exists.


-- ┌──────────────────────────── 0004_demo_sites.sql ────────────────────────────┐

-- Ideovent Technologies, demo sites: the private slot and the open log
--
-- WHY THIS EXISTS
-- ---------------
-- A demo site is the institute's OWN website, built for them and served at
-- ideovent.vercel.app/site/<their-name>. The record has to be readable by
-- `anon`, because the whole point is that the director opens the link without
-- an account. So `demoSites` is public content, like `projects` and
-- `pitchPages`, and it needs nothing from this file: the policy written by 0003
-- already lets anyone select any collection that is not named in its exclusion
-- list.
--
-- Two collections BESIDE it are a different matter, and they are what this
-- migration is for. Each one is the half of a decision that the browser cannot
-- argue with, because hiding a value in a React component fixes nothing: it is
-- still in the payload.
--
--   demoSiteSlots   Mehdi's private slot beside each demo. It holds `sentTo`,
--                   which is a named human being ("Mrs Rao, principal, by
--                   WhatsApp"), and `internalNotes`, which is where somebody
--                   writes what they actually think of a prospect. On a
--                   world-readable row that is one View Source away from the
--                   person it is about, on a page built to flatter them. Same
--                   mechanism, same reasoning, as `pitchPageNotes` in 0003.
--
--   demoSiteOpens   One row per browser session that opened a demo. When and
--                   how often a named institute read a page is information
--                   about THEM, not about us, so only a signed-in admin may
--                   read it. But it has to be WRITTEN by the public page, which
--                   runs as `anon`, and that is the insert policy below.
--
-- WHY THE OPEN COUNT IS ROWS AND NOT A COUNTER FIELD. `anon` cannot UPDATE any
-- row in this table, and 0001 is right not to let it: an anonymous visitor able
-- to update `public.content` could rewrite the site. So a counter living on the
-- demo record would sit at zero for ever and be indistinguishable from nobody
-- having opened the link, which is the one reading Mehdi must never be given
-- falsely, because he decides whether to follow up on it. What `anon` CAN be
-- given is a narrow insert, so an open is a new row and the number is a count.
-- `openCount` and `lastOpenedAt` are therefore DERIVED and never stored: see
-- `demoOpenStats` in src/lib/demo/slots.ts.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) AFTER 0003.
-- Re-running it is safe.

-- ── Read ──────────────────────────────────────────────
-- Replaces the policy last written by 0003. The two new collections join the
-- list of collections anonymous visitors may not select.
-- KEEP THIS LIST IDENTICAL TO PRIVATE_COLLECTIONS in src/lib/cms/types.ts.
drop policy if exists "read public content" on public.content;
create policy "read public content" on public.content
  for select
  using (collection not in (
    'submissions',
    'applications',
    'certificateGrades',
    'pitchPageNotes',
    'demoSiteSlots',
    'demoSiteOpens'
  ));

-- "read all authed" from 0001 is unchanged: a signed-in admin still reads
-- everything, which is what /admin -> Demo sites needs in order to show the
-- slot fields and the open count at all.

-- ── Write ─────────────────────────────────────────────
-- Replaces the policy written by 0001. `anon` may now insert into one more
-- collection, and one only.
--
-- THE INSERT IS DELIBERATELY NOT PAIRED WITH A SELECT. A visitor may add an
-- open and can never read the log back, so nobody can enumerate which
-- institutes were sent a demo by asking the database for the list. Write-only
-- is the correct shape for a tally that is nobody's business but ours.
--
-- The row it writes is tiny and carries no identity: a demo id and a
-- timestamp, and nothing about the reader. See src/lib/demo/opens.ts, which
-- also keeps it to one row per browser session so a refresh does not inflate
-- the number Mehdi is reading.
drop policy if exists "insert leads anon" on public.content;
create policy "insert leads anon" on public.content
  for insert to anon
  with check (collection in ('submissions', 'applications', 'demoSiteOpens'));

-- ── Belt and braces ───────────────────────────────────
-- If a private slot field is ever written onto a PUBLIC demo record by an older
-- build or a hand-edited import, strip it. The demo record is world-readable;
-- who it was sent to is not.
update public.content
   set data = data - 'sentTo' - 'internalNotes' - 'internalName' - 'notes'
 where collection = 'demoSites'
   and (data ? 'sentTo' or data ? 'internalNotes'
        or data ? 'internalName' or data ? 'notes');

-- Verification. All of these should return zero rows.
--
--   set role anon;
--   select count(*) from public.content where collection = 'demoSiteSlots';
--   select count(*) from public.content where collection = 'demoSiteOpens';
--   select count(*) from public.content
--    where collection = 'demoSites' and (data ? 'sentTo' or data ? 'internalNotes');
--   reset role;
--
-- And this one should return the demo sites, which is correct:
--   set role anon;
--   select data->>'slug', data->>'status' from public.content where collection = 'demoSites';
--   reset role;
--
-- A DRAFT demo IS readable by anon at the database level, exactly as a draft
-- pitch page is, and for the same reason: this is a single-table public content
-- store and the status gate is in `resolveDemoSite()`, which renders the 404.
-- It is not a secret-keeping mechanism. Do not put anything in a draft record
-- that would matter if it were read. The fields that would are in the slot,
-- which is why the slot is a separate collection.


-- ┌──────────────────────────── 0005_harden_admin_and_reads.sql ────────────────────────────┐

-- ════════════════════════════════════════════════════════════════════════════
-- 0005: only the admin can write, and the public can read only what is public.
-- Written 25 September 2026, before the first real Supabase project was wired.
-- Safe to run more than once.
-- ════════════════════════════════════════════════════════════════════════════
--
-- TWO HOLES THIS CLOSES
--
-- 1. "authenticated" meant "anyone with an account", and anyone can make one.
--    0001 granted select, insert, update and delete on every row to the role
--    `authenticated`. A new Supabase project allows email sign-ups by default,
--    and the anon key that permits a sign-up is shipped in the site's JavaScript
--    by design. So a stranger could call supabase.auth.signUp() from the browser
--    console, become `authenticated`, and read every lead, every internship
--    application, every certificate grade, and then edit or delete the site.
--    Now every write, and every read of private rows, requires the signed-in
--    email to be in public.admins. Turn sign-ups off in the dashboard as well
--    (Authentication > Sign In / Providers > Allow new users to sign up): this
--    file is the lock, that switch is the second one.
--
-- 2. The public could list the whole sales pipeline.
--    "read public content" excluded the private collections but returned every
--    pitch page and every demo site, including drafts and closed ones. With the
--    public anon key, one REST call listed every institute being pitched, the
--    price quoted to each, and every demo not yet sent. A pitch page is meant to
--    be reachable by the one person holding its link, not enumerable. Now anon
--    reads a pitch page only when it is live and a demo only when it is sent,
--    which is exactly what the site's own routes already serve.
--
-- WHO IS THE ADMIN
-- The one line to check before running is the INSERT into public.admins below.
-- It must be the email you use to log in at /admin (the user you create under
-- Authentication > Users). If it is wrong nothing breaks for visitors: /admin
-- simply cannot save, and you add the right one with the same INSERT.
-- ════════════════════════════════════════════════════════════════════════════

-- ── The allowlist ───────────────────────────────────────────────────────────
create table if not exists public.admins (
  email text primary key
);

-- RLS on and NO policies: nobody can read or write this table through the API,
-- not even the admin. It is edited only here, in the SQL editor.
alter table public.admins enable row level security;

insert into public.admins (email)
values ('mehdialam2002@gmail.com')          -- ← your /admin login email
on conflict (email) do nothing;

-- SECURITY DEFINER so the policies below can consult public.admins even though
-- the caller cannot read it. search_path pinned so the function cannot be
-- redirected to a lookalike table in another schema.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.admins a
     where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ── Content: public reads ───────────────────────────────────────────────────
drop policy if exists "read public content" on public.content;
create policy "read public content" on public.content
  for select
  using (
    collection not in (
      'submissions',
      'applications',
      'certificateGrades',
      'pitchPageNotes',
      'demoSiteSlots',
      'demoSiteOpens'
    )
    and (collection <> 'pitchPages' or data ->> 'status' = 'live')
    and (collection <> 'demoSites'  or data ->> 'status' = 'sent')
  );

-- ── Content: the admin reads everything ─────────────────────────────────────
drop policy if exists "read all authed" on public.content;
drop policy if exists "read all admin"  on public.content;
create policy "read all admin" on public.content
  for select to authenticated
  using (public.is_admin());

-- ── Content: writes are the admin's ─────────────────────────────────────────
drop policy if exists "insert authed" on public.content;
drop policy if exists "insert admin"  on public.content;
create policy "insert admin" on public.content
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "update authed" on public.content;
drop policy if exists "update admin"  on public.content;
create policy "update admin" on public.content
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "delete authed" on public.content;
drop policy if exists "delete admin"  on public.content;
create policy "delete admin" on public.content
  for delete to authenticated
  using (public.is_admin());

-- ── Content: what a visitor may submit ──────────────────────────────────────
-- A contact message, the lead pop-up, an internship application, and the
-- "this demo was opened" ping. Capped at 20 KB of JSON so the open insert
-- cannot be used to fill the database. Applies to anon AND authenticated so a
-- signed-in admin testing the public form is not refused.
drop policy if exists "insert leads anon" on public.content;
create policy "insert leads anon" on public.content
  for insert to anon, authenticated
  with check (
    collection in ('submissions', 'applications', 'demoSiteOpens')
    and octet_length(data::text) < 20000
  );

-- ── Storage: uploads are the admin's ────────────────────────────────────────
drop policy if exists "admin upload media" on storage.objects;
create policy "admin upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin());

drop policy if exists "admin delete media" on storage.objects;
create policy "admin delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());


-- ┌──────────────────────────── 0006_ai_keys.sql ────────────────────────────┐

-- ════════════════════════════════════════════════════════════════════════════
-- 0006: AI provider keys for "poster to demo", and a log of every attempt.
-- Written 27 September 2026. Needs 0005 (public.is_admin()). Safe to run more
-- than once, and safe to run ON ITS OWN on the live project: paste only this
-- file into Supabase > SQL Editor > New query > Run.
-- ════════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS IS FOR
-- Mehdi uploads a school or coaching poster in /admin, /api/poster sends it to
-- an AI model, and the facts on the poster fill a demo template. The API keys
-- for those models are typed into /admin, not into code or Vercel settings, so
-- they have to live somewhere only the admin can read. That is this table.
--
-- WHY A TABLE OF ITS OWN AND NOT A ROW IN public.content
-- public.content is the site's CMS. Parts of it are world-readable by design,
-- the admin Export downloads all of it as a JSON file, and a snapshot of it is
-- committed to the repository. A secret must be in none of those places. Here
-- it sits behind its own RLS, which says one thing: only an admin.
--
-- HOW /api/poster READS IT
-- With the CALLER'S token, through PostgREST. There is no service_role key in
-- the function, so the function can read a key only when the person calling
-- it is an admin: these policies are the whole of the access check, not a
-- second copy of one.
--
-- ONE KEY PER PROVIDER
-- provider is the primary key. That is deliberate: making several free
-- accounts to multiply a free limit is against each provider's terms, and can
-- get the account (and the Google account behind it) banned. When one key is
-- out of quota, the function moves on to the NEXT PROVIDER in priority order,
-- and when all are out, Mehdi fills the template by hand.
-- ════════════════════════════════════════════════════════════════════════════

-- ── The keys ────────────────────────────────────────────────────────────────
create table if not exists public.ai_provider_keys (
  provider      text primary key
                check (provider in ('gemini', 'openai', 'xai', 'anthropic')),
  api_key       text not null,
  model         text not null,
  -- Lower is tried first.
  priority      int  not null default 100,
  enabled       boolean not null default true,
  -- Written by /api/poster after each attempt. A value starting "limit:" with
  -- last_error_at earlier today (India time) makes the function skip this
  -- provider until tomorrow, so a key that is out of quota is not hammered.
  last_error    text,
  last_error_at timestamptz,
  updated_at    timestamptz default now()
);

alter table public.ai_provider_keys enable row level security;

-- Nobody signed out gets anywhere near this table, not even an empty select.
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

-- ── The attempt log ─────────────────────────────────────────────────────────
-- One row per provider tried, written by /api/poster with the admin's own
-- token. It never holds a key, a poster, or what the model read: only which
-- provider, how it went, and a short error text. It is how the admin can see
-- "Gemini ran out at 4 pm" without opening Vercel logs.
create table if not exists public.ai_poster_runs (
  id         bigserial primary key,
  provider   text,
  status     text check (status in ('ok', 'limit', 'error')),
  detail     text,
  created_at timestamptz default now()
);

alter table public.ai_poster_runs enable row level security;

revoke all on table public.ai_poster_runs from anon;
grant select, insert on table public.ai_poster_runs to authenticated;
grant usage, select on sequence public.ai_poster_runs_id_seq to authenticated;

drop policy if exists "ai runs select admin" on public.ai_poster_runs;
create policy "ai runs select admin" on public.ai_poster_runs
  for select to authenticated
  using (public.is_admin());

drop policy if exists "ai runs insert admin" on public.ai_poster_runs;
create policy "ai runs insert admin" on public.ai_poster_runs
  for insert to authenticated
  with check (public.is_admin());

create index if not exists ai_poster_runs_created_idx
  on public.ai_poster_runs (created_at desc);

-- Verification, as a signed-out visitor. Both should fail with
-- "permission denied", which is the point.
--
--   set role anon;
--   select count(*) from public.ai_provider_keys;
--   select count(*) from public.ai_poster_runs;
--   reset role;


-- ┌──────────────────────────── 0007_outreach.sql ────────────────────────────┐

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


-- ┌───────────────────────── 0008_ai_keys_multi.sql ──────────────────────────┐

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


-- ┌───────────────────────── 0009_google_maps_key.sql ─────────────────────────┐

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

-- ┌────────────────────────── 0010_payments.sql ───────────────────────────┐

-- ════════════════════════════════════════════════════════════════════════════
-- 0010: Payments. Razorpay subscription and payment events, for /admin/payments.
-- Written 1 October 2026. Needs 0005 (public.is_admin()). Safe to run more
-- than once, and safe to run ON ITS OWN on the live project: paste only this
-- file into Supabase > SQL Editor > New query > Run.
-- ════════════════════════════════════════════════════════════════════════════
--
-- WHAT THIS IS FOR
-- The site takes the monthly website plans (Starter, Growth) and the yearly
-- Starter through Razorpay. Razorpay reports every sign-up, monthly charge,
-- failed charge, cancellation, paid order and paid Payment Link to
-- /api/razorpay/webhook, and each of those events becomes one row here, which
-- /admin/payments lists. The Razorpay Dashboard stays the full record; this is
-- the short list Mehdi reads without logging in to Razorpay.
--
-- WHY A TABLE OF ITS OWN AND NOT ROWS IN public.content
-- A payment row carries a customer's name, phone and e-mail. public.content is
-- the CMS: parts of it are world-readable by design, the admin Export downloads
-- all of it, and a snapshot of it is committed to the repository. Payments must
-- be in none of those. Here they sit behind RLS that says one thing: only an
-- admin may read them.
--
-- WHO WRITES A ROW
-- Nobody, directly: no role has insert or update on the table and no policy
-- allows one. Rows arrive only through public.record_payment_event(), which the
-- webhook calls with the PUBLIC anon key (there is no service_role key anywhere
-- in this project; api/_lib/supabaseRest.js says why). The anon key is in every
-- visitor's browser, so the function trusts nothing about its caller: it
-- inserts only for a caller that shows the webhook's INGEST TOKEN, and it
-- checks that token against a fingerprint, SHA-256(token), that the admin
-- stored. Without the token, a forged "payment captured" row cannot get in.
--
-- NO SECRET IS KEPT HERE
-- The Razorpay key secret and the webhook secret live in Vercel's server
-- environment and nowhere else. The webhook (api/razorpay/webhook.js) checks
-- Razorpay's signature with the webhook secret, then derives the ingest token
-- from it: HMAC-SHA256(webhook secret, a fixed label), api/_lib/razorpay.js.
-- public.payment_settings holds only SHA-256 of that token. A hash cannot be
-- turned back into the token, and the token cannot be turned back into the
-- secret, so a copy of this whole database signs nothing and forges nothing.
-- The fingerprint is stored by "Connect" in /admin/payments, which runs as the
-- signed-in admin (api/razorpay/connect.js). A new webhook secret in Vercel
-- means a new token: press Connect again (GO-LIVE-IDEOVENT-IN.md, section 10).
-- ════════════════════════════════════════════════════════════════════════════

-- ── The events ──────────────────────────────────────────────────────────────
-- The columns are the few things the admin list sorts and shows; the whole
-- verified event is kept in `payload` as Razorpay sent it.
create table if not exists public.payment_events (
  event_id            text primary key,          -- Razorpay's x-razorpay-event-id
  body_sha256         text not null unique,      -- the signed body: a replay under a new id is still one row
  event               text not null,             -- subscription.charged, order.paid, payment.failed ...
  mode                text check (mode in ('test', 'live')),
  subscription_id     text,
  subscription_status text,
  plan_id             text,
  paid_count          int,
  total_count         int,
  remaining_count     int,
  payment_id          text,
  payment_status      text,
  method              text,
  amount              bigint,                    -- paise (cents for a USD payment)
  currency            text,
  error_description   text,
  order_id            text,
  invoice_id          text,
  payment_link_id     text,
  plan_key            text,                      -- our checkout's plan: starter, growth, starter-yearly
  business            text,
  customer_name       text,
  customer_phone      text,
  customer_email      text,
  event_at            timestamptz,               -- when Razorpay created the event
  payload             jsonb not null,
  received_at         timestamptz not null default now()
);

create index if not exists payment_events_received_idx
  on public.payment_events (received_at desc);
create index if not exists payment_events_subscription_idx
  on public.payment_events (subscription_id, event_at desc);

-- ── The webhook's fingerprint (not a secret) ────────────────────────────────
-- One row. ingest_sha256 is SHA-256 of the webhook's ingest token, in hex.
create table if not exists public.payment_settings (
  id            text primary key check (id = 'razorpay'),
  ingest_sha256 text not null check (ingest_sha256 ~ '^[0-9a-f]{64}$'),
  connected_at  timestamptz not null default now(),
  connected_by  text                              -- the admin's e-mail
);

-- ── Access ──────────────────────────────────────────────────────────────────
alter table public.payment_events   enable row level security;
alter table public.payment_settings enable row level security;

-- Supabase's default privileges grant every new table to anon and
-- authenticated. Take all of it back, then give the admin exactly two verbs.
revoke all on table public.payment_events   from anon, authenticated;
revoke all on table public.payment_settings from anon, authenticated;
grant select, delete on table public.payment_events to authenticated;

drop policy if exists "payment events select admin" on public.payment_events;
create policy "payment events select admin" on public.payment_events
  for select to authenticated
  using (public.is_admin());

-- Delete, so test-mode events can be cleared after testing. There is no
-- insert or update policy on purpose: see WHO WRITES A ROW above.
drop policy if exists "payment events delete admin" on public.payment_events;
create policy "payment events delete admin" on public.payment_events
  for delete to authenticated
  using (public.is_admin());

-- public.payment_settings: RLS on and NO policies, like public.admins in 0005.

-- ── Recording one event (called by /api/razorpay/webhook) ───────────────────
-- Returns 'recorded', or 'duplicate' when this event (or this exact signed
-- body) is already stored: Razorpay delivers at least once. Raises, and writes
-- nothing, when no fingerprint is stored or the token does not match it.
-- sha256() is built into Postgres (11 and later): no extension is needed.
-- Dropped and made again, so every run leaves exactly this version (Postgres
-- cannot rename the arguments of an existing function in place).
drop function if exists public.record_payment_event(text, text, text, text);
create function public.record_payment_event(
  p_token    text,
  p_event_id text,
  p_body     text,
  p_mode     text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected text;
  v_hash     text;
  v_evt      jsonb;
  v_sub      jsonb;
  v_pay      jsonb;
  v_ord      jsonb;
  v_link     jsonb;
  v_notes    jsonb;
  v_rows     int;
begin
  select s.ingest_sha256 into v_expected from public.payment_settings s where s.id = 'razorpay';
  if v_expected is null then
    raise exception 'payments: the webhook is not connected yet (press Connect in /admin/payments)'
      using errcode = '28000';
  end if;
  -- Hashes are compared, never the token itself: how long the comparison takes
  -- says nothing about the token.
  if p_token is null or length(p_token) > 200
     or encode(sha256(convert_to(p_token, 'UTF8')), 'hex') <> v_expected then
    raise exception 'payments: the webhook token does not match (a new webhook secret? press Connect in /admin/payments again)'
      using errcode = '28000';
  end if;
  if p_body is null or octet_length(p_body) > 262144 then
    raise exception 'payments: missing or oversized event';
  end if;

  v_hash := encode(sha256(convert_to(p_body, 'UTF8')), 'hex');
  v_evt  := p_body::jsonb;
  if jsonb_typeof(v_evt) <> 'object' then
    raise exception 'payments: the event is not a JSON object';
  end if;
  v_sub  := v_evt #> '{payload,subscription,entity}';
  v_pay  := v_evt #> '{payload,payment,entity}';
  v_ord  := v_evt #> '{payload,order,entity}';
  v_link := v_evt #> '{payload,payment_link,entity}';
  -- Our checkout's notes ride on the subscription or the order. Razorpay
  -- sends [] rather than {} when an entity has none.
  v_notes := coalesce(
    case when jsonb_typeof(v_sub -> 'notes') = 'object' then v_sub -> 'notes' end,
    case when jsonb_typeof(v_ord -> 'notes') = 'object' then v_ord -> 'notes' end,
    case when jsonb_typeof(v_link -> 'notes') = 'object' then v_link -> 'notes' end,
    case when jsonb_typeof(v_pay -> 'notes') = 'object' then v_pay -> 'notes' end,
    '{}'::jsonb);

  insert into public.payment_events (
    event_id, body_sha256, event, mode,
    subscription_id, subscription_status, plan_id, paid_count, total_count, remaining_count,
    payment_id, payment_status, method, amount, currency, error_description,
    order_id, invoice_id, payment_link_id,
    plan_key, business, customer_name, customer_phone, customer_email,
    event_at, payload)
  values (
    left(coalesce(nullif(trim(p_event_id), ''), 'sha256:' || v_hash), 100),
    v_hash,
    left(coalesce(v_evt ->> 'event', 'unknown'), 60),
    case when p_mode in ('test', 'live') then p_mode end,
    v_sub ->> 'id',
    v_sub ->> 'status',
    v_sub ->> 'plan_id',
    (v_sub ->> 'paid_count')::int,
    (v_sub ->> 'total_count')::int,
    (v_sub ->> 'remaining_count')::int,
    v_pay ->> 'id',
    v_pay ->> 'status',
    v_pay ->> 'method',
    coalesce((v_pay ->> 'amount')::bigint, (v_ord ->> 'amount_paid')::bigint, (v_link ->> 'amount_paid')::bigint),
    coalesce(v_pay ->> 'currency', v_ord ->> 'currency', v_link ->> 'currency'),
    left(v_pay ->> 'error_description', 300),
    coalesce(v_ord ->> 'id', v_pay ->> 'order_id'),
    v_pay ->> 'invoice_id',
    v_link ->> 'id',
    left(v_notes ->> 'plan', 40),
    left(v_notes ->> 'business', 120),
    left(coalesce(v_notes ->> 'name', v_link #>> '{customer,name}'), 120),
    left(coalesce(v_notes ->> 'phone', v_pay ->> 'contact', v_link #>> '{customer,contact}'), 40),
    left(coalesce(v_notes ->> 'email', v_pay ->> 'email', v_link #>> '{customer,email}'), 160),
    case when v_evt ? 'created_at' then to_timestamp((v_evt ->> 'created_at')::double precision) end,
    v_evt)
  on conflict do nothing;

  get diagnostics v_rows = row_count;
  return case when v_rows > 0 then 'recorded' else 'duplicate' end;
end;
$$;

-- Supabase's default privileges grant every new function to anon and
-- authenticated by name, so revoking from PUBLIC alone would leave those.
revoke all on function public.record_payment_event(text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_payment_event(text, text, text, text) to anon;

-- ── Connecting the webhook (the "Connect" button in /admin/payments) ────────
-- Stores the fingerprint that api/razorpay/connect.js computes on the server
-- from the webhook secret. Admin only. Returns when it was stored.
create or replace function public.set_payment_ingest(p_sha256 text)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'payments: only the admin can connect the webhook' using errcode = '42501';
  end if;
  if p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'payments: expected a SHA-256 fingerprint in lower-case hex';
  end if;
  insert into public.payment_settings (id, ingest_sha256, connected_at, connected_by)
  values ('razorpay', p_sha256, now(), left(auth.jwt() ->> 'email', 200))
  on conflict (id) do update
    set ingest_sha256 = excluded.ingest_sha256,
        connected_at  = excluded.connected_at,
        connected_by  = excluded.connected_by
  returning connected_at into v_at;
  return v_at;
end;
$$;

revoke all on function public.set_payment_ingest(text) from public, anon, authenticated;
grant execute on function public.set_payment_ingest(text) to authenticated;

-- ── Is the webhook connected? (for /admin/payments) ─────────────────────────
-- `matches` says whether the stored fingerprint is p_sha256, the one the
-- server computes from today's webhook secret. It is false after the secret
-- changes in Vercel: then connect again. Admin only.
create or replace function public.payment_ingest_status(p_sha256 text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
  v_at   timestamptz;
begin
  if not public.is_admin() then
    raise exception 'payments: admin only' using errcode = '42501';
  end if;
  select s.ingest_sha256, s.connected_at into v_hash, v_at
    from public.payment_settings s where s.id = 'razorpay';
  return jsonb_build_object(
    'connected',   v_hash is not null,
    'connectedAt', v_at,
    'matches',     coalesce(v_hash is not null and v_hash = lower(p_sha256), false));
end;
$$;

revoke all on function public.payment_ingest_status(text) from public, anon, authenticated;
grant execute on function public.payment_ingest_status(text) to authenticated;

-- Verification, as a signed-out visitor. The two selects must fail with
-- "permission denied", the first call must fail ("not connected yet" or "does
-- not match") and write nothing, and the second must be refused outright:
--
--   set role anon;
--   select count(*) from public.payment_events;
--   select count(*) from public.payment_settings;
--   select public.record_payment_event('forged', 'evt_forged', '{"event":"payment.captured"}', null);
--   select public.set_payment_ingest(repeat('0', 64));
--   reset role;

notify pgrst, 'reload schema';

-- ┌────────────────────────── 0011_crm_team.sql ──────────────────────────┐

-- ════════════════════════════════════════════════════════════════════════════
-- 0011: The CRM team. People Mehdi lets into the CRM (interns, and later a
-- trusted admin) sign in, see the leads he assigns them, and work them. Mehdi
-- (the owner) sees and controls everything, exactly as today.
-- Written 1 October 2026. Needs 0004 (demo rows in public.content), 0005
-- (public.admins, public.is_admin()) and 0007 (the outreach tables). Safe to
-- run more than once, and safe to run ON ITS OWN on the live project: paste
-- only this file into Supabase > SQL Editor > New query > Run.
-- ════════════════════════════════════════════════════════════════════════════
--
-- WHO IS WHO
--   owner   Mehdi. Whoever public.is_admin() says (an e-mail in public.admins,
--           0005). Everything, as before, plus the Team page and the audit log.
--   admin   A trusted senior, later. Sees and works every lead, assigns and
--           distributes. Cannot delete, import, export, change settings or the
--           team, move a lead to or from Proposal or Won, or lift Do not contact.
--   member  An intern. Sees and works ONLY the leads assigned to them, while
--           open and for 14 days after they close. With "See all leads" on,
--           also a read-only list of every lead, without phone, WhatsApp,
--           e-mail, contact name or notes (crm_leads_overview).
--   Switched off (active = false) or not in the team: nothing, from the very
--   next query. Roles are looked up in public.crm_members on every query, never
--   carried in the login token, so switching someone off needs no logout.
--
-- WHAT THE DATABASE ENFORCES (the app only shows it)
--   * Which rows each person reads and writes: RLS on every CRM table.
--   * Which FIELDS a member may change: private.crm_leads_guard (a trigger).
--     RLS works per row and cannot compare old and new values.
--   * Who wrote each history line, and when: private.crm_events_guard stamps
--     the writer and the server's clock. A browser cannot backdate a touch.
--   * Who moved, changed, viewed or deleted what: public.crm_audit, append-only,
--     readable by the owner only. Keep it at least a year (DPDP Rules 2025, r.6).
--   * Money is never delegated (SOP-10): nobody but Mehdi moves a lead to or
--     from Proposal or Won or logs an after-call summary or a proposal; a
--     member never sets stage Call (calls with Mehdi come from a hand-over).
--   * A member reads a lead in full while it is open and for 14 days after it
--     closes, never longer. A member's queue of leads nobody has written to
--     (New) has a cap; a share-out hands out only New leads unless told.
--   * Notes only grow for a member; nobody but Mehdi or an admin rewrites them.
--   * Every person but Mehdi has a daily write budget, so no one person can
--     fill the database (Free plan: read-only at 500 MB for everyone).
--   * What anyone but Mehdi writes into a lead or a history line has the
--     shape the screens read (text, coded fields from their lists, real
--     dates), so one odd value cannot break the CRM for everyone.
--   * One school, one lead: a member cannot add, or fill in, a number or an
--     e-mail another lead already has (numbers compared on their last ten
--     digits), and the refusal does not say whose it is.
--   * Visitors (anon) alone submit the public forms and demo opens; a demo
--     open is stamped with the server's time and only counts for a live demo.
--
-- NO SECRET KEY ANYWHERE. Logins are created in the Supabase dashboard
-- (Authentication > Users > Add user > Create new user, Auto Confirm). The
-- owner adds the same e-mail in CRM > Team; the first sign-in links the two
-- (public.crm_me). Every function here runs as the signed-in caller's request
-- and checks who that caller is.
--
-- WHAT DOES NOT CHANGE FOR MEHDI
--   Every lead, event and setting stays where it is. Existing leads are marked
--   as added by him; the ones he has written to (or moved past New) are
--   assigned to him, and the ones nobody has written to stay Unassigned, the
--   pool he shares out. His "Mine" view is "assigned to me, or Unassigned", so
--   it shows today's leads. Existing history is marked as his. His reads and
--   writes pass every policy below, including the app's current upsert of
--   whole leads, so the app as deployed today keeps working with this file
--   applied (the multi-user screens come after).
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. A schema the Data API does not expose ────────────────────────────────
-- Policy helpers and trigger functions live here: PostgREST only serves the
-- schemas listed under Exposed schemas (public), so nothing here is an RPC.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;


-- ── 2. Small pure helpers ───────────────────────────────────────────────────
-- A timestamp in the app's own format (JavaScript toISOString), so server
-- times sort with the ones already stored.
create or replace function private.crm_iso(p_at timestamptz)
returns text language sql stable set search_path = '' as $$
  select to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

-- A stored ISO string as a timestamp, or null when it is not one.
create or replace function private.crm_ts(p_text text)
returns timestamptz language plpgsql stable set search_path = '' as $$
begin
  if p_text is null or btrim(p_text) = '' then
    return null;
  end if;
  return p_text::timestamptz;
exception when others then
  return null;
end $$;

-- Empty: missing, JSON null, "", whitespace, or [].
create or replace function private.crm_blank(p jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select p is null or p = 'null'::jsonb or p = '[]'::jsonb
      or (jsonb_typeof(p) = 'string' and btrim(p #>> '{}') = '')
$$;

-- Open = nothing has finished it (derive.ts CLOSED_STATUSES).
create or replace function private.crm_is_open(p_status text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_status, 'new') not in ('won', 'lost', 'do_not_contact')
$$;

-- How many days a member still reads a lead after it closes (Won, Lost, Do
-- not contact): long enough to answer a late reply, short enough that closed
-- leads do not pile up in one person's reach (DPDP Rules 2025, r.6: minimum access).
create or replace function private.crm_closed_days()
returns integer language sql immutable set search_path = '' as $$
  select 14
$$;

-- The keys of a lead's `data` a member may change on a lead assigned to them.
-- A NEW member-editable field means adding its key here (create or replace).
create or replace function private.crm_member_free_keys()
returns text[] language sql immutable set search_path = '' as $$
  select array['status', 'nextActionAt', 'lastContactedAt', 'language', 'tags', 'lostReason', 'updatedAt']
$$;

-- Keys a member may fill in when they are empty, and never change once filled
-- (a wrong number is reported through Ask Mehdi; the owner or an admin
-- corrects it). The observation is here too: a different one goes into the
-- history as a line, so the Lead Finder's or Mehdi's wording is never lost.
create or replace function private.crm_member_fill_keys()
returns text[] language sql immutable set search_path = '' as $$
  select array['contactName', 'phone', 'whatsapp', 'email', 'website', 'city', 'state', 'observation']
$$;

-- Keys a member may only ADD to: the new value must start with the old one.
-- One textarea saved on blur could otherwise empty Mehdi's notes for good.
create or replace function private.crm_member_append_keys()
returns text[] language sql immutable set search_path = '' as $$
  select array['notes']
$$;

-- What one person (anyone but Mehdi) may write in one India-time day. Real
-- work stays far below these; a loop, a bug or a grudge hits them first. A
-- limit is changed here (create or replace), never per request.
create or replace function private.crm_daily_limit(p_kind text)
returns integer language sql immutable set search_path = '' as $$
  select case p_kind
    when 'event'       then 300    -- history lines, Ask Mehdi, hand-overs
    when 'lead_add'    then 50     -- leads added (with "Can add leads")
    when 'lead_change' then 400    -- changes to leads
    when 'log'         then 1500   -- lead pages opened, contacts shown
    when 'lookup'      then 300    -- duplicate checks
    else 100 end
$$;

-- Mirrors of the columns that the app adds when it reads a lead. They are
-- never stored in `data`: the columns are the truth.
create or replace function private.crm_column_keys()
returns text[] language sql immutable set search_path = '' as $$
  select array['assigneeId', 'assigneeName', 'assignedAt', 'assignedById', 'createdById', 'qualifiedById']
$$;

-- The values a lead's coded fields may take (src/lib/outreach/types.ts).
-- Anyone but Mehdi writes only these; test-crm-access.mjs checks every list
-- against the TypeScript. A new value means adding it here and there.
create or replace function private.crm_lead_values(p_key text)
returns text[] language sql immutable set search_path = '' as $$
  select case p_key
    when 'status'   then array['new', 'contacted', 'replied', 'demo_opened', 'call', 'proposal', 'won', 'lost', 'do_not_contact']
    when 'kind'     then array['school', 'coaching', 'dental', 'other']
    when 'pitch'    then array['new_website', 'fix_website']
    when 'language' then array['en', 'hinglish', 'hi']
    end
$$;

-- The same for a history line (types.ts, team.ts and templates.ts).
create or replace function private.crm_event_values(p_key text)
returns text[] language sql immutable set search_path = '' as $$
  select case p_key
    when 'channel' then array['email', 'whatsapp', 'call']
    when 'stage'   then array['first', 'after_reply', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'after_call', 'proposal']
    when 'outcome' then array['connected_interested', 'connected_callback', 'connected_not_interested', 'no_answer', 'busy', 'switched_off', 'wrong_number']
    when 'topic'   then array['demo', 'correction', 'question']
    end
$$;

-- The keys of a lead that hold a moment in time.
create or replace function private.crm_date_keys()
returns text[] language sql immutable set search_path = '' as $$
  select array['createdAt', 'updatedAt', 'nextActionAt', 'lastContactedAt']
$$;

-- A phone or WhatsApp number as the duplicate check compares it: its last ten
-- digits, whatever the spaces or the prefix ("098100 00002", "+91 98100 00002"
-- and "+919810000002" are one number). Fewer than 7 digits: no number.
create or replace function private.crm_phone_key(p text)
returns text language sql immutable set search_path = '' as $$
  select case when length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 7
              then right(regexp_replace(p, '\D', '', 'g'), 10) end
$$;

-- An e-mail as the duplicate check compares it: no case, no outer spaces.
create or replace function private.crm_email_key(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(lower(btrim(coalesce(p, ''))), '')
$$;

-- The longest detail one access-log line takes, in bytes: Mehdi 2 KB, anyone
-- else 300 (the app's own are under 100), so the log cannot fill the database.
create or replace function private.crm_log_detail_max(p_owner boolean)
returns integer language sql immutable set search_path = '' as $$
  select case when p_owner then 2000 else 300 end
$$;


-- ── 3. The team ─────────────────────────────────────────────────────────────
-- One row per person. `id` is the member id every other table points at, so
-- history keeps its names after a login is deleted. `user_id` is the Supabase
-- login: empty until the first sign-in links it (or after the login is
-- deleted, which also switches the row off).
create table if not exists public.crm_members (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid unique references auth.users (id) on delete set null,
  email                text not null check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  display_name         text not null check (length(btrim(display_name)) between 1 and 80),
  role                 text not null default 'member' check (role in ('owner', 'admin', 'member')),
  view_all             boolean not null default false,      -- member: read-only list of every lead
  can_add_leads        boolean not null default false,      -- member: may add leads (they become theirs)
  wa_daily_limit       integer default 25 check (wa_daily_limit is null or wa_daily_limit between 0 and 500),
  -- Most leads nobody has written to yet (status New) the person may hold: the
  -- queue that hoarding would fill. Contacted leads do not count; the overdue
  -- alarm on the Team page watches the follow-up load instead.
  new_lead_cap         integer not null default 40 check (new_lead_cap between 1 and 1000),
  -- May call people who have not replied (TRAI TCCCPR 2025: five complaints in
  -- ten days bar every number of the sender). Off: calls only to leads that replied.
  may_cold_call        boolean not null default false,
  targets              jsonb not null default '{}'::jsonb check (jsonb_typeof(targets) = 'object'),
  sender_name          text check (sender_name is null or length(sender_name) <= 80),
  sender_phone         text check (sender_phone is null or length(sender_phone) <= 20),
  -- Mehdi saw a test message arrive from sender_phone (WhatsApp Business on the
  -- company number). Until then the CRM blocks the person's WhatsApp sends.
  sender_checked_at    timestamptz,
  signature            text check (signature is null or length(signature) <= 500),
  active               boolean not null default true,
  must_change_password boolean not null default true,
  joined_at            timestamptz,
  last_seen_at         timestamptz,
  deactivated_at       timestamptz,
  created_by           uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create unique index if not exists crm_members_email_key on public.crm_members (lower(email));

alter table public.crm_members enable row level security;
-- Supabase stops granting new tables to the API roles on 30 Oct 2026: grant
-- exactly what is needed. Writes go only through the owner's functions below.
revoke all on table public.crm_members from public, anon, authenticated;
grant select on table public.crm_members to authenticated;
grant all on table public.crm_members to service_role;


-- ── 4. Who is calling (read from the table on EVERY query) ──────────────────
-- Policies call these as (select private.crm_x()), so each runs once per
-- statement (an InitPlan), not once per row.
create or replace function private.crm_role()
returns text language sql stable security definer set search_path = '' as $$
  select case
    when public.is_admin() then 'owner'
    else (select m.role from public.crm_members m
           where m.user_id = auth.uid() and m.active and m.role in ('admin', 'member'))
  end
$$;

create or replace function private.crm_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.crm_members m
   where m.user_id = auth.uid() and m.active
     and (m.role <> 'owner' or public.is_admin())
$$;

create or replace function private.crm_view_all()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.crm_role() in ('owner', 'admin'), false)
      or exists (select 1 from public.crm_members m
                  where m.user_id = auth.uid() and m.active and m.role = 'member' and m.view_all)
$$;

create or replace function private.crm_can_add()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.crm_role() in ('owner', 'admin'), false)
      or exists (select 1 from public.crm_members m
                  where m.user_id = auth.uid() and m.active and m.role = 'member' and m.can_add_leads)
$$;

-- Mehdi's member id: the host of booked calls and the default "Mine".
create or replace function private.crm_default_host()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.crm_members m
   where m.role = 'owner' and m.active
   order by m.created_at, m.id
   limit 1
$$;


-- ── 5. Leads: who a lead belongs to is a column, never the JSON ─────────────
-- data->>'assignedTo', the free-text name the old "Assign to" box wrote, stays
-- as an old label only: RLS reads assigned_to.
alter table public.outreach_leads add column if not exists assigned_to  uuid references public.crm_members (id) on delete set null;
alter table public.outreach_leads add column if not exists assigned_at  timestamptz;
alter table public.outreach_leads add column if not exists assigned_by  uuid references public.crm_members (id) on delete set null;
alter table public.outreach_leads add column if not exists created_by   uuid references public.crm_members (id) on delete set null;
-- The member who qualified the lead and booked the call (credit after hand-over).
alter table public.outreach_leads add column if not exists qualified_by uuid references public.crm_members (id) on delete set null;
-- When the lead closed (Won, Lost, Do not contact); null while it is open.
-- Stamped by the guard, never by a browser. A member's read ends 14 days after.
alter table public.outreach_leads add column if not exists closed_at    timestamptz;

create index if not exists outreach_leads_assigned_idx  on public.outreach_leads (assigned_to, updated_at desc);
create index if not exists outreach_leads_created_by_idx on public.outreach_leads (created_by);
create index if not exists outreach_leads_qualified_idx on public.outreach_leads (qualified_by);
create index if not exists outreach_leads_assigned_by_idx on public.outreach_leads (assigned_by);
-- The team-wide duplicate check (private.crm_duplicate_of): numbers by their
-- last ten digits, e-mails without case. (A first draft of this file indexed
-- the raw text; those indexes go.)
drop index if exists public.outreach_leads_phone_idx;
drop index if exists public.outreach_leads_whatsapp_idx;
drop index if exists public.outreach_leads_email_idx;
create index if not exists outreach_leads_phone_key_idx    on public.outreach_leads ((private.crm_phone_key(data ->> 'phone')));
create index if not exists outreach_leads_whatsapp_key_idx on public.outreach_leads ((private.crm_phone_key(data ->> 'whatsapp')));
create index if not exists outreach_leads_email_key_idx    on public.outreach_leads ((private.crm_email_key(data ->> 'email')));
create index if not exists outreach_leads_demo_idx         on public.outreach_leads ((data ->> 'demoId')) where data ? 'demoId';


-- ── 6. History: who wrote each line ─────────────────────────────────────────
alter table public.outreach_events add column if not exists actor_id uuid references public.crm_members (id) on delete set null;
create index if not exists outreach_events_actor_idx on public.outreach_events (actor_id, created_at desc);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'outreach_events_lead_fk') then
    -- NOT VALID: an old orphan row (if any) does not block this file; every new
    -- row is checked. Deleting a lead now deletes its history with it.
    alter table public.outreach_events add constraint outreach_events_lead_fk
      foreign key (lead_id) references public.outreach_leads (id) on delete cascade not valid;
  end if;
end $$;


-- ── 7. The audit trail (append-only; the owner reads it) ────────────────────
create table if not exists public.crm_audit (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,            -- crm_members.id; null = SQL editor, migration or Supabase itself
  actor_user  uuid,            -- auth.uid()
  actor_email text,
  action      text not null check (length(action) <= 40),
  lead_id     text,
  member_id   uuid,
  detail      jsonb not null default '{}'::jsonb
);
create index if not exists crm_audit_at_idx     on public.crm_audit (at desc);
create index if not exists crm_audit_lead_idx   on public.crm_audit (lead_id, at desc);
create index if not exists crm_audit_actor_idx  on public.crm_audit (actor_id, at desc);
create index if not exists crm_audit_action_idx on public.crm_audit (action, at desc);

alter table public.crm_audit enable row level security;
revoke all on table public.crm_audit from public, anon, authenticated;
grant select on table public.crm_audit to authenticated;   -- rows arrive only through the functions below
grant all on table public.crm_audit to service_role;


-- ── 8. Notifications (the bell in the CRM header) ───────────────────────────
create table if not exists public.crm_notifications (
  id         bigint generated always as identity primary key,
  member_id  uuid not null references public.crm_members (id) on delete cascade,
  kind       text not null check (kind in ('assigned', 'moved_away', 'handoff', 'review', 'info', 'demo_ready', 'resolved')),
  title      text not null check (length(title) <= 300),
  lead_id    text,
  actor_id   uuid,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists crm_notifications_member_idx on public.crm_notifications (member_id, created_at desc);
create index if not exists crm_notifications_unread_idx on public.crm_notifications (member_id) where read_at is null;

alter table public.crm_notifications enable row level security;
revoke all on table public.crm_notifications from public, anon, authenticated;
grant select on table public.crm_notifications to authenticated;
grant update (read_at) on table public.crm_notifications to authenticated;   -- "mark as read", nothing else
grant all on table public.crm_notifications to service_role;


-- ── 9. Reviews (phase 2): the owner marks a member's send or call note ──────
create table if not exists public.crm_reviews (
  id          bigint generated always as identity primary key,
  event_id    text not null unique references public.outreach_events (id) on delete cascade,
  lead_id     text not null,
  member_id   uuid not null references public.crm_members (id) on delete cascade,   -- whose work: the line's writer
  reviewer_id uuid references public.crm_members (id) on delete set null,
  verdict     text not null check (verdict in ('good', 'fix')),
  comment     text check (comment is null or length(comment) <= 1000),
  created_at  timestamptz not null default now()
);
create index if not exists crm_reviews_member_idx on public.crm_reviews (member_id, created_at desc);
create index if not exists crm_reviews_reviewer_idx on public.crm_reviews (reviewer_id);

alter table public.crm_reviews enable row level security;
revoke all on table public.crm_reviews from public, anon, authenticated;
grant select, insert, update, delete on table public.crm_reviews to authenticated;
grant all on table public.crm_reviews to service_role;


-- ── 10. Booked calls (phase 2): one host, one slot, one prospect ────────────
-- Calls sit on a 15-minute grid and last 15 minutes, so "two interns offered
-- the same time" is exactly a unique index.
create table if not exists public.crm_bookings (
  id         bigint generated always as identity primary key,
  lead_id    text not null references public.outreach_leads (id) on delete cascade,
  host_id    uuid not null references public.crm_members (id),
  booked_by  uuid references public.crm_members (id) on delete set null,
  slot_at    timestamptz not null,
  minutes    integer not null default 15 check (minutes = 15),
  status     text not null default 'booked' check (status in ('booked', 'done', 'no_show', 'cancelled')),
  note       text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists crm_bookings_slot_key on public.crm_bookings (host_id, slot_at) where status = 'booked';
create index if not exists crm_bookings_lead_idx on public.crm_bookings (lead_id);
create index if not exists crm_bookings_host_idx on public.crm_bookings (host_id, slot_at);
create index if not exists crm_bookings_booked_by_idx on public.crm_bookings (booked_by);

alter table public.crm_bookings enable row level security;
revoke all on table public.crm_bookings from public, anon, authenticated;
grant select on table public.crm_bookings to authenticated;   -- writes: crm_handoff, crm_set_booking
grant all on table public.crm_bookings to service_role;


-- ── 11. Assignment rules (round-robin by kind and city) ─────────────────────
create table if not exists public.crm_assignment_rules (
  id         bigint generated always as identity primary key,
  name       text not null check (length(btrim(name)) between 1 and 80),
  kind       text check (kind is null or kind in ('school', 'coaching', 'dental', 'other')),
  city       text check (city is null or length(btrim(city)) between 1 and 80),
  member_ids uuid[] not null check (cardinality(member_ids) between 1 and 50),
  priority   integer not null default 100,
  active     boolean not null default true,
  next_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_assignment_rules enable row level security;
revoke all on table public.crm_assignment_rules from public, anon, authenticated;
grant select, insert, update, delete on table public.crm_assignment_rules to authenticated;
grant all on table public.crm_assignment_rules to service_role;


-- ── 11b. Requests to Mehdi: open until he marks them done ───────────────────
-- Every Ask Mehdi (a demo, a correction, a question) and every hand-over is a
-- row that stays open until Mehdi (or the admin it went to) resolves it, so
-- reading the bell never closes it. They head Mehdi's Today ("Waiting on
-- you"). A hand-over he marks "accepted" is the one number about an intern
-- that the intern cannot type in themselves.
create table if not exists public.crm_requests (
  id           bigint generated always as identity primary key,
  lead_id      text not null references public.outreach_leads (id) on delete cascade,
  kind         text not null check (kind in ('demo', 'correction', 'question', 'handoff', 'give_back')),
  asked_by     uuid references public.crm_members (id) on delete set null,
  host_id      uuid references public.crm_members (id) on delete set null,
  body         text check (body is null or length(body) <= 500),
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references public.crm_members (id) on delete set null,
  outcome      text check (outcome is null or outcome in ('done', 'accepted', 'not_real', 'no_action')),
  outcome_note text check (outcome_note is null or length(outcome_note) <= 500)
);
create index if not exists crm_requests_open_idx  on public.crm_requests (host_id, created_at) where resolved_at is null;
create index if not exists crm_requests_lead_idx  on public.crm_requests (lead_id);
create index if not exists crm_requests_asked_idx on public.crm_requests (asked_by, created_at desc);
create index if not exists crm_requests_resolved_by_idx on public.crm_requests (resolved_by);

alter table public.crm_requests enable row level security;
revoke all on table public.crm_requests from public, anon, authenticated;
grant select on table public.crm_requests to authenticated;   -- writes: crm_ask_owner, crm_handoff, crm_resolve_request
grant all on table public.crm_requests to service_role;


-- ── 11c. The daily write budget (not in the API: schema private) ────────────
create table if not exists private.crm_usage (
  member_id uuid not null references public.crm_members (id) on delete cascade,
  day       date not null,
  kind      text not null,
  n         integer not null default 0,
  primary key (member_id, day, kind)
);
revoke all on table private.crm_usage from public, anon, authenticated;
grant all on table private.crm_usage to service_role;


-- ── 12. Helpers the triggers and functions share ────────────────────────────
-- One more write by the caller today. Raises past the day's limit (54000).
-- Mehdi has no budget; neither has a trusted caller (no member: the SQL
-- editor, a migration). The count rolls back with a refused write.
create or replace function private.crm_spend(p_kind text, p_n integer default 1)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_me    uuid := private.crm_member_id();
  v_limit integer := private.crm_daily_limit(p_kind);
  v_used  integer;
begin
  if v_me is null or public.is_admin() then
    return;
  end if;
  insert into private.crm_usage as u (member_id, day, kind, n)
  values (v_me, (now() at time zone 'Asia/Kolkata')::date, p_kind, greatest(coalesce(p_n, 1), 1))
  on conflict (member_id, day, kind) do update set n = u.n + excluded.n
  returning u.n into v_used;
  if v_used > v_limit then
    raise exception 'crm: that is more than one person may do in a day (% a day). It starts again at midnight India time; if this is real work, ask Mehdi.', v_limit
      using errcode = '54000';
  end if;
end $$;

-- True when a member (p_me) may read and work this lead: it is theirs, and it
-- is open or closed less than crm_closed_days() ago.
create or replace function private.crm_member_reads(p_assigned uuid, p_status text, p_closed_at timestamptz, p_me uuid)
returns boolean language sql stable set search_path = '' as $$
  select p_me is not null and p_assigned is not distinct from p_me
     and (private.crm_is_open(p_status)
          or p_closed_at > now() - make_interval(days => private.crm_closed_days()))
$$;

-- Leads nobody has written to yet (New) a person holds: the capped queue.
create or replace function private.crm_new_count(p_member uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.outreach_leads l
   where l.assigned_to = p_member and coalesce(l.data ->> 'status', 'new') = 'new'
$$;

-- Open leads a person holds.
create or replace function private.crm_open_count(p_member uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.outreach_leads l
   where l.assigned_to = p_member and private.crm_is_open(l.data ->> 'status')
$$;

-- Raises unless p_member is an active team member who can take these leads.
-- For a member: p_new more New leads within new_lead_cap (the queue nobody
-- has written to); p_open more open leads within 1,000 in all (a guard
-- against a slip, not a workload rule); and none at Call or Proposal
-- (p_mehdis), which stay with Mehdi (SOP-10).
drop function if exists private.crm_check_assignee(uuid, integer);
create or replace function private.crm_check_assignee(p_member uuid, p_new integer default 0,
                                                      p_open integer default 0, p_mehdis integer default 0)
returns void language plpgsql stable security definer set search_path = '' as $$
declare
  m      public.crm_members%rowtype;
  v_have integer;
begin
  select * into m from public.crm_members where id = p_member;
  if not found or not m.active then
    raise exception 'crm: that person is not an active team member' using errcode = '22023';
  end if;
  if m.role <> 'member' then
    return;
  end if;
  if coalesce(p_mehdis, 0) > 0 then
    raise exception 'crm: % of these are at Call or Proposal. Those stay with Mehdi; untick them.', p_mehdis
      using errcode = '22023';
  end if;
  if coalesce(p_new, 0) > 0 then
    v_have := private.crm_new_count(p_member);
    if v_have + p_new > m.new_lead_cap then
      raise exception 'crm: % would have % new leads waiting (nobody has written to them yet); the limit is %. Let them work some first, or raise it in Team.',
        m.display_name, v_have + p_new, m.new_lead_cap using errcode = '22023';
    end if;
  end if;
  if coalesce(p_open, 0) > 0 then
    v_have := private.crm_open_count(p_member);
    if v_have + p_open > 1000 then
      raise exception 'crm: % would hold % open leads; nobody holds more than 1,000. Close their finished leads first.',
        m.display_name, v_have + p_open using errcode = '22023';
    end if;
  end if;
end $$;

-- The lead already holding this phone, WhatsApp or e-mail, across the WHOLE
-- team, whoever may read it. Answers the name and whose it is, never a contact.
-- Numbers match on their last ten digits and e-mails without case, so a
-- different way of writing the same number is the same number.
drop function if exists private.crm_duplicate_of(text, text, text, text);
create or replace function private.crm_duplicate_of(p_phone text, p_whatsapp text, p_email text, p_exclude text)
returns table (lead_id text, institute_name text, assignee_name text, assigned_to uuid, status text, closed_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.id, l.data ->> 'instituteName', coalesce(m.display_name, 'Unassigned'), l.assigned_to,
         l.data ->> 'status', l.closed_at
    from public.outreach_leads l
    left join public.crm_members m on m.id = l.assigned_to
   where coalesce(private.crm_phone_key(p_phone), private.crm_phone_key(p_whatsapp), private.crm_email_key(p_email)) is not null
     and l.id is distinct from p_exclude
     and (   private.crm_phone_key(l.data ->> 'phone') in (private.crm_phone_key(p_phone), private.crm_phone_key(p_whatsapp))
          or private.crm_phone_key(l.data ->> 'whatsapp') in (private.crm_phone_key(p_phone), private.crm_phone_key(p_whatsapp))
          or private.crm_email_key(l.data ->> 'email') = private.crm_email_key(p_email))
   order by l.updated_at desc nulls last
   limit 1
$$;

-- A display name for history lines.
create or replace function private.crm_name(p_member uuid, p_fallback text default 'Unassigned')
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select m.display_name from public.crm_members m where m.id = p_member), p_fallback)
$$;


-- ── 13. Policies: ONE permissive policy per table and command ──────────────
-- (Several permissive policies are OR-ed and each one is evaluated: lint 0006.)

-- Leads
drop policy if exists "outreach leads select admin" on public.outreach_leads;
drop policy if exists "outreach leads insert admin" on public.outreach_leads;
drop policy if exists "outreach leads update admin" on public.outreach_leads;
drop policy if exists "outreach leads delete admin" on public.outreach_leads;
drop policy if exists "crm leads select" on public.outreach_leads;
drop policy if exists "crm leads insert" on public.outreach_leads;
drop policy if exists "crm leads update" on public.outreach_leads;
drop policy if exists "crm leads delete" on public.outreach_leads;

-- A member reads a lead of theirs while it is open, and for 14 days after it
-- closes (crm_closed_days): the contacts one person can read stay the ones
-- they are working, not every number they ever had.
create policy "crm leads select" on public.outreach_leads
  for select to authenticated
  using (
    (select private.crm_role()) in ('owner', 'admin')
    or (assigned_to = (select private.crm_member_id())
        and (private.crm_is_open(data ->> 'status')
             or closed_at > (select now() - make_interval(days => private.crm_closed_days()))))
  );

-- A member adds a lead only with "Can add leads" on, and only as their own
-- (the BEFORE trigger sets assigned_to before this check runs).
create policy "crm leads insert" on public.outreach_leads
  for insert to authenticated
  with check (
    (select private.crm_role()) in ('owner', 'admin')
    or ((select private.crm_can_add()) and assigned_to = (select private.crm_member_id()))
  );

-- A member edits only a lead assigned to them, and it stays theirs. WHICH
-- fields they may change is private.crm_leads_guard's job.
create policy "crm leads update" on public.outreach_leads
  for update to authenticated
  using (
    (select private.crm_role()) in ('owner', 'admin')
    or (assigned_to = (select private.crm_member_id())
        and (private.crm_is_open(data ->> 'status')
             or closed_at > (select now() - make_interval(days => private.crm_closed_days()))))
  )
  with check (
    (select private.crm_role()) in ('owner', 'admin')
    or assigned_to = (select private.crm_member_id())
  );

create policy "crm leads delete" on public.outreach_leads
  for delete to authenticated
  using ((select public.is_admin()));

-- History: a lead's history goes with the lead. Whoever may read the lead now
-- reads its history (after a reassignment too), nobody else. Each policy
-- checks "active member" itself (crm_member_id is null when switched off).
drop policy if exists "outreach events select admin" on public.outreach_events;
drop policy if exists "outreach events insert admin" on public.outreach_events;
drop policy if exists "outreach events update admin" on public.outreach_events;
drop policy if exists "outreach events delete admin" on public.outreach_events;
drop policy if exists "crm events select" on public.outreach_events;
drop policy if exists "crm events insert" on public.outreach_events;
drop policy if exists "crm events update" on public.outreach_events;
drop policy if exists "crm events delete" on public.outreach_events;

create policy "crm events select" on public.outreach_events
  for select to authenticated
  using (
    (select private.crm_role()) in ('owner', 'admin')
    or lead_id in (select l.id from public.outreach_leads l
                    where l.assigned_to = (select private.crm_member_id())
                      and (private.crm_is_open(l.data ->> 'status')
                           or l.closed_at > (select now() - make_interval(days => private.crm_closed_days()))))
  );

create policy "crm events insert" on public.outreach_events
  for insert to authenticated
  with check (
    (select private.crm_role()) in ('owner', 'admin')
    or lead_id in (select l.id from public.outreach_leads l
                    where l.assigned_to = (select private.crm_member_id())
                      and (private.crm_is_open(l.data ->> 'status')
                           or l.closed_at > (select now() - make_interval(days => private.crm_closed_days()))))
  );

-- History is append-only for everyone but the owner.
create policy "crm events update" on public.outreach_events
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "crm events delete" on public.outreach_events
  for delete to authenticated
  using ((select public.is_admin()));

-- Settings: everyone in the team reads them (quiet hours, signature); the owner writes.
drop policy if exists "outreach settings select admin" on public.outreach_settings;
drop policy if exists "outreach settings insert admin" on public.outreach_settings;
drop policy if exists "outreach settings update admin" on public.outreach_settings;
drop policy if exists "outreach settings delete admin" on public.outreach_settings;
drop policy if exists "crm settings select" on public.outreach_settings;
drop policy if exists "crm settings insert" on public.outreach_settings;
drop policy if exists "crm settings update" on public.outreach_settings;
drop policy if exists "crm settings delete" on public.outreach_settings;

create policy "crm settings select" on public.outreach_settings
  for select to authenticated
  using ((select private.crm_role()) is not null);
create policy "crm settings insert" on public.outreach_settings
  for insert to authenticated
  with check ((select public.is_admin()));
create policy "crm settings update" on public.outreach_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "crm settings delete" on public.outreach_settings
  for delete to authenticated
  using ((select public.is_admin()));

-- The team: the owner and admins read every row; anyone reads their own (a
-- switched-off person learns why the CRM is closed). No write policy: the
-- owner's functions below are the only way in.
drop policy if exists "crm members select" on public.crm_members;
create policy "crm members select" on public.crm_members
  for select to authenticated
  using (
    (select private.crm_role()) in ('owner', 'admin')
    or user_id = (select auth.uid())
  );

-- The audit trail: the owner only.
drop policy if exists "crm audit select" on public.crm_audit;
create policy "crm audit select" on public.crm_audit
  for select to authenticated
  using ((select public.is_admin()));

-- Notifications: each person their own.
drop policy if exists "crm notifications select" on public.crm_notifications;
drop policy if exists "crm notifications update" on public.crm_notifications;
create policy "crm notifications select" on public.crm_notifications
  for select to authenticated
  using (member_id = (select private.crm_member_id()));
create policy "crm notifications update" on public.crm_notifications
  for update to authenticated
  using (member_id = (select private.crm_member_id()))
  with check (member_id = (select private.crm_member_id()));

-- Reviews: the owner and admins write and read; a member reads their own.
drop policy if exists "crm reviews select" on public.crm_reviews;
drop policy if exists "crm reviews insert" on public.crm_reviews;
drop policy if exists "crm reviews update" on public.crm_reviews;
drop policy if exists "crm reviews delete" on public.crm_reviews;
create policy "crm reviews select" on public.crm_reviews
  for select to authenticated
  using (
    (select private.crm_role()) in ('owner', 'admin')
    or member_id = (select private.crm_member_id())
  );
create policy "crm reviews insert" on public.crm_reviews
  for insert to authenticated
  with check ((select private.crm_role()) in ('owner', 'admin'));
create policy "crm reviews update" on public.crm_reviews
  for update to authenticated
  using ((select private.crm_role()) in ('owner', 'admin'))
  with check ((select private.crm_role()) in ('owner', 'admin'));
create policy "crm reviews delete" on public.crm_reviews
  for delete to authenticated
  using ((select private.crm_role()) in ('owner', 'admin'));

-- Requests to Mehdi: the owner and admins read all; a member reads their own
-- (to see that a demo request was done). Writes go through the functions.
drop policy if exists "crm requests select" on public.crm_requests;
create policy "crm requests select" on public.crm_requests
  for select to authenticated
  using (
    (select private.crm_role()) in ('owner', 'admin')
    or asked_by = (select private.crm_member_id())
  );

-- Bookings: the owner and admins, the host, and the person who booked.
drop policy if exists "crm bookings select" on public.crm_bookings;
create policy "crm bookings select" on public.crm_bookings
  for select to authenticated
  using (
    (select private.crm_role()) in ('owner', 'admin')
    or booked_by = (select private.crm_member_id())
    or host_id = (select private.crm_member_id())
  );

-- Assignment rules: the owner and admins read; the owner writes.
drop policy if exists "crm rules select" on public.crm_assignment_rules;
drop policy if exists "crm rules insert" on public.crm_assignment_rules;
drop policy if exists "crm rules update" on public.crm_assignment_rules;
drop policy if exists "crm rules delete" on public.crm_assignment_rules;
create policy "crm rules select" on public.crm_assignment_rules
  for select to authenticated
  using ((select private.crm_role()) in ('owner', 'admin'));
create policy "crm rules insert" on public.crm_assignment_rules
  for insert to authenticated
  with check ((select public.is_admin()));
create policy "crm rules update" on public.crm_assignment_rules
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "crm rules delete" on public.crm_assignment_rules
  for delete to authenticated
  using ((select public.is_admin()));


-- ── 14. Which fields each person may change on a lead ───────────────────────
-- SECURITY INVOKER on purpose: current_user tells the API roles (anon,
-- authenticated) from the trusted callers (the SQL editor, a migration, and
-- the SECURITY DEFINER functions below, where current_user is their owner).
create or replace function private.crm_leads_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_role  text;
  v_me    uuid;
  v_iso   text := private.crm_iso(now());
  v_old_s text;
  v_new_s text;
  v_cap   integer;
  v_ts    timestamptz;
  v_vals  text[];
  v       jsonb;
  k       text;
begin
  -- Trusted callers keep the assignment stamps and the closing date right,
  -- and nothing else.
  if current_user not in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.assigned_to is not null then
        new.assigned_at := coalesce(new.assigned_at, now());
        new.assigned_by := coalesce(new.assigned_by, private.crm_member_id());
      end if;
      new.closed_at := case when private.crm_is_open(new.data ->> 'status') then null
                            else coalesce(new.closed_at, now()) end;
    else
      if new.assigned_to is distinct from old.assigned_to then
        new.assigned_at := case when new.assigned_to is null then null else now() end;
        new.assigned_by := case when new.assigned_to is null then null else private.crm_member_id() end;
      end if;
      if private.crm_is_open(new.data ->> 'status') then
        new.closed_at := null;
      elsif private.crm_is_open(old.data ->> 'status') then
        new.closed_at := now();
      end if;   -- closed to closed: as given (the migration back-fills old leads)
    end if;
    return new;
  end if;

  v_role := private.crm_role();
  v_me   := private.crm_member_id();
  if v_role is null then
    raise exception 'crm: you do not have access to the CRM' using errcode = '42501';
  end if;
  -- A member adds leads only with "Can add leads" on. Asked FIRST, before the
  -- budget and the duplicate check: without it, a refused insert must not say
  -- whether a number is in the CRM (the insert policy alone runs too late).
  if tg_op = 'INSERT' and v_role = 'member' and not private.crm_can_add() then
    raise exception 'crm: adding leads is not switched on for you. Ask Mehdi.' using errcode = '42501';
  end if;
  -- A lead is a card, not a store: 32 KB is far above any real one.
  if v_role <> 'owner' and octet_length(coalesce(new.data, '{}'::jsonb)::text) > 32000 then
    raise exception 'crm: that lead is too large (32 KB at most). Put long text in a note.' using errcode = '22001';
  end if;
  if jsonb_typeof(coalesce(new.data, '{}'::jsonb)) <> 'object' then
    raise exception 'crm: a lead must be a JSON object' using errcode = '22023';
  end if;

  -- Every API write: the record carries its own id, the column mirrors never
  -- live in the JSON, and the time is the server's.
  new.data := (coalesce(new.data, '{}'::jsonb) - private.crm_column_keys())
              || jsonb_build_object('id', new.id, 'updatedAt', v_iso);
  new.updated_at := now();

  -- What anyone but Mehdi writes has the shape every screen reads: text (tags:
  -- a list of texts), a coded field from its list, a date that is a date. One
  -- number, list or object where text belongs would break the CRM's pages for
  -- everyone until it was repaired in the SQL editor. On a change only the
  -- keys that changed are looked at, so an old odd value blocks nothing.
  if v_role <> 'owner' then
    for k, v in select e.key, e.value from jsonb_each(new.data) e loop
      if tg_op = 'UPDATE' then
        continue when (old.data -> k) is not distinct from v;
      end if;
      continue when jsonb_typeof(v) = 'null';
      if k = 'tags' then
        if jsonb_typeof(v) <> 'array'
           or exists (select 1 from jsonb_array_elements(v) t where jsonb_typeof(t) <> 'string') then
          raise exception 'crm: "tags" must be a list of words' using errcode = '22023';
        end if;
        continue;
      end if;
      if jsonb_typeof(v) <> 'string' then
        raise exception 'crm: "%" must be text', k using errcode = '22023';
      end if;
      v_vals := private.crm_lead_values(k);
      if v_vals is not null and not ((v #>> '{}') = any (v_vals)) then
        raise exception 'crm: "%" must be one of: %', k, array_to_string(v_vals, ', ') using errcode = '22023';
      end if;
      if k = any (private.crm_date_keys()) then
        v_ts := private.crm_ts(v #>> '{}');
        if v_ts is null or v_ts < timestamptz '2000-01-01 00:00:00+00' or v_ts >= timestamptz '2100-01-01 00:00:00+00' then
          raise exception 'crm: "%" must be a date', k using errcode = '22023';
        end if;
        new.data := new.data || jsonb_build_object(k, private.crm_iso(v_ts));
      end if;
    end loop;
    if private.crm_blank(new.data -> 'instituteName') then
      if tg_op = 'INSERT' then
        raise exception 'crm: a lead needs the institute''s name' using errcode = '23514';
      elsif not private.crm_blank(old.data -> 'instituteName') then
        raise exception 'crm: a lead needs the institute''s name' using errcode = '23514';
      end if;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.created_by   := v_me;
    new.qualified_by := null;
    if v_role = 'member' then
      perform private.crm_spend('lead_add');
      -- A lead a member adds is theirs, whatever the request said. It carries
      -- no demo or pitch link (the owner's: a borrowed demo id would show
      -- another lead's opens) and starts at New, so it counts in their queue.
      new.assigned_to := v_me;
      new.assigned_at := now();
      new.assigned_by := v_me;
      new.data := (new.data - array['demoId', 'demoSlug', 'pitchSlug', 'assignedTo'])
                  || jsonb_build_object('createdAt', v_iso, 'status', 'new');
      -- One school, one lead, across the whole team. The refusal names neither
      -- the school nor whose it is: a refused insert costs no budget, so a
      -- named answer here would be a free lookup. crm_find_duplicate names
      -- them, and counts against the day's lookups.
      if exists (select 1 from private.crm_duplicate_of(new.data ->> 'phone', new.data ->> 'whatsapp',
                                                         new.data ->> 'email', new.id)) then
        raise exception 'crm: this phone number or e-mail already belongs to a lead in the CRM. Ask Mehdi before adding it again.'
          using errcode = '23505';
      end if;
      select m.new_lead_cap into v_cap from public.crm_members m where m.id = v_me;
      if private.crm_new_count(v_me) >= v_cap then
        raise exception 'crm: you already have % new leads waiting, your limit. Send their first messages first, or ask Mehdi to raise it.', v_cap
          using errcode = '22023';
      end if;
      perform private.crm_check_assignee(v_me, 0, 1, 0);
    else
      if private.crm_blank(new.data -> 'createdAt') then
        new.data := new.data || jsonb_build_object('createdAt', v_iso);
      end if;
      if new.assigned_to is not null then
        perform private.crm_check_assignee(new.assigned_to,
          case when coalesce(new.data ->> 'status', 'new') = 'new' then 1 else 0 end,
          case when private.crm_is_open(new.data ->> 'status') then 1 else 0 end,
          case when new.data ->> 'status' in ('call', 'proposal') then 1 else 0 end);
        new.assigned_at := now();
        new.assigned_by := v_me;
      else
        new.assigned_at := null;
        new.assigned_by := null;
      end if;
    end if;
  else
    -- UPDATE
    if new.id is distinct from old.id then
      raise exception 'crm: a lead id never changes' using errcode = '42501';
    end if;
    if new.created_by is distinct from old.created_by then
      raise exception 'crm: who added a lead never changes' using errcode = '42501';
    end if;

    v_old_s := coalesce(old.data ->> 'status', 'new');
    v_new_s := coalesce(new.data ->> 'status', 'new');
    if v_new_s is distinct from v_old_s and v_role <> 'owner' then
      -- Money, proposals and pricing are never delegated (SOP-10).
      if v_new_s in ('proposal', 'won') or v_old_s in ('proposal', 'won') then
        raise exception 'crm: only Mehdi moves a lead to or from Proposal and Won' using errcode = '42501';
      end if;
      if v_old_s = 'do_not_contact' then
        raise exception 'crm: only Mehdi can take a lead off Do not contact' using errcode = '42501';
      end if;
      -- A call with Mehdi comes from a hand-over (crm_handoff), never from a
      -- member typing the stage: his time is not booked without him.
      if v_role = 'member' and (v_new_s = 'call' or v_old_s = 'call') then
        raise exception 'crm: only Mehdi moves a lead to Call. If they want a call, use "Hand to Mehdi".' using errcode = '42501';
      end if;
    end if;

    if v_role in ('owner', 'admin') then
      if new.qualified_by is distinct from old.qualified_by and v_role <> 'owner' then
        raise exception 'crm: only Mehdi changes who qualified a lead' using errcode = '42501';
      end if;
      if new.assigned_to is distinct from old.assigned_to then
        if new.assigned_to is not null then
          perform private.crm_check_assignee(new.assigned_to,
            case when v_new_s = 'new' then 1 else 0 end,
            case when private.crm_is_open(v_new_s) then 1 else 0 end,
            case when v_new_s in ('call', 'proposal') then 1 else 0 end);
        end if;
        new.assigned_at := case when new.assigned_to is null then null else now() end;
        new.assigned_by := case when new.assigned_to is null then null else v_me end;
      else
        new.assigned_at := old.assigned_at;
        new.assigned_by := old.assigned_by;
      end if;
      -- A demo linked to someone else's lead: it is their next step, now
      -- (crm_leads_after tells them, and closes Mehdi's open demo requests).
      if (new.data -> 'demoId') is distinct from (old.data -> 'demoId') and not private.crm_blank(new.data -> 'demoId')
         and new.assigned_to is not null and new.assigned_to is distinct from v_me
         and private.crm_is_open(v_new_s) then
        new.data := new.data || jsonb_build_object('nextActionAt', v_iso);
      end if;
    else
      -- A member, on a lead assigned to them (RLS let nothing else through).
      perform private.crm_spend('lead_change');
      if new.assigned_to is distinct from old.assigned_to
         or new.assigned_at is distinct from old.assigned_at
         or new.assigned_by is distinct from old.assigned_by
         or new.qualified_by is distinct from old.qualified_by then
        raise exception 'crm: only Mehdi or an admin can change who a lead belongs to' using errcode = '42501';
      end if;
      if v_new_s = 'lost' and v_old_s <> 'lost' and private.crm_blank(new.data -> 'lostReason') then
        raise exception 'crm: say why the lead is lost' using errcode = '23514';
      end if;
      -- Notes only grow: the new text must start with the old one.
      for k in select unnest(private.crm_member_append_keys()) loop
        if (new.data -> k) is distinct from (old.data -> k) and not private.crm_blank(old.data -> k)
           and (jsonb_typeof(new.data -> k) is distinct from 'string'
                or left(new.data ->> k, length(old.data ->> k)) is distinct from (old.data ->> k)) then
          raise exception 'crm: % only grow: add to them, never replace them. Only Mehdi or an admin rewrites them.', k
            using errcode = '42501';
        end if;
      end loop;
      for k in select jsonb_object_keys(old.data) union select jsonb_object_keys(new.data) loop
        continue when k in ('id', 'updatedAt');
        continue when k = any (private.crm_member_free_keys());
        continue when k = any (private.crm_member_append_keys());
        continue when (old.data -> k) is not distinct from (new.data -> k);
        continue when k = any (private.crm_member_fill_keys())
                      and private.crm_blank(old.data -> k) and not private.crm_blank(new.data -> k);
        raise exception 'crm: only Mehdi or an admin can change "%" on a lead. Add a note instead.', k
          using errcode = '42501';
      end loop;
      -- A number or e-mail filled in must not be another lead's: one school,
      -- one lead, across the team (the same refusal as adding it).
      if (private.crm_blank(old.data -> 'phone') and not private.crm_blank(new.data -> 'phone'))
         or (private.crm_blank(old.data -> 'whatsapp') and not private.crm_blank(new.data -> 'whatsapp'))
         or (private.crm_blank(old.data -> 'email') and not private.crm_blank(new.data -> 'email')) then
        if exists (select 1 from private.crm_duplicate_of(
                     case when private.crm_blank(old.data -> 'phone') then new.data ->> 'phone' end,
                     case when private.crm_blank(old.data -> 'whatsapp') then new.data ->> 'whatsapp' end,
                     case when private.crm_blank(old.data -> 'email') then new.data ->> 'email' end,
                     new.id)) then
          raise exception 'crm: this phone number or e-mail already belongs to another lead in the CRM. Ask Mehdi before using it here.'
            using errcode = '23505';
        end if;
      end if;
      -- A touch is dated by the server: a member cannot backdate or erase one.
      if (new.data -> 'lastContactedAt') is distinct from (old.data -> 'lastContactedAt') then
        new.data := new.data || jsonb_build_object('lastContactedAt', v_iso);
      end if;
    end if;
  end if;

  -- When it closed is the server's: a member reads a closed lead for 14 days.
  if private.crm_is_open(new.data ->> 'status') then
    new.closed_at := null;
  elsif tg_op = 'UPDATE' then
    if private.crm_is_open(old.data ->> 'status') then
      new.closed_at := now();
    else
      new.closed_at := old.closed_at;
    end if;
  else
    new.closed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists crm_leads_guard on public.outreach_leads;
create trigger crm_leads_guard
  before insert or update on public.outreach_leads
  for each row execute function private.crm_leads_guard();


-- ── 15. After a lead changes: the audit line, and the history line ──────────
create or replace function private.crm_leads_after()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- Changed, but the values are not copied into the log (minimisation).
  personal constant text[] := array['phone', 'whatsapp', 'email', 'contactName', 'notes', 'observation', 'lostReason'];
  changes  jsonb := '{}'::jsonb;
  k        text;
  v_actor  uuid := private.crm_member_id();
  v_from   text;
  v_to     text;
  v_by     text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(old.data) union select jsonb_object_keys(new.data) loop
      if k not in ('updatedAt', 'id') and (old.data -> k) is distinct from (new.data -> k) then
        changes := changes || jsonb_build_object(k,
          case when k = any (personal) then to_jsonb('(changed)'::text)
               else jsonb_build_array(old.data -> k, new.data -> k) end);
      end if;
    end loop;
    if new.assigned_to is distinct from old.assigned_to then
      changes := changes || jsonb_build_object('assigned_to', jsonb_build_array(old.assigned_to, new.assigned_to));
    end if;
    if new.qualified_by is distinct from old.qualified_by then
      changes := changes || jsonb_build_object('qualified_by', jsonb_build_array(old.qualified_by, new.qualified_by));
    end if;
    if changes = '{}'::jsonb then
      return null;
    end if;
    -- Which keys changed is always kept; values too long to be useful are not.
    if octet_length(changes::text) > 4000 then
      changes := jsonb_build_object('keys', (select jsonb_agg(x) from jsonb_object_keys(changes) as x),
                                    'note', 'values too long to log');
    end if;
  end if;

  insert into public.crm_audit (actor_id, actor_user, actor_email, action, lead_id, detail)
  values (
    v_actor, auth.uid(), auth.jwt() ->> 'email',
    case when tg_op = 'INSERT' then 'lead.insert'
         when tg_op = 'DELETE' then 'lead.delete'
         when new.assigned_to is distinct from old.assigned_to then 'lead.assign'
         else 'lead.update' end,
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op = 'UPDATE' then changes
         when tg_op = 'INSERT' then jsonb_build_object('instituteName', new.data ->> 'instituteName',
                                     'source', new.data ->> 'source', 'assigned_to', new.assigned_to)
         else jsonb_build_object('instituteName', old.data ->> 'instituteName',
                                 'status', old.data ->> 'status', 'assigned_to', old.assigned_to) end);

  -- The lead's own history says where it went. A hand-over writes its own line.
  if tg_op = 'UPDATE' and new.assigned_to is distinct from old.assigned_to
     and coalesce(current_setting('crm.quiet_assign', true), '') <> 'on' then
    v_from := private.crm_name(old.assigned_to);
    v_to   := private.crm_name(new.assigned_to);
    v_by   := private.crm_name(v_actor, 'the system');
    insert into public.outreach_events (id, lead_id, data, actor_id)
    values ('oe_as_' || replace(gen_random_uuid()::text, '-', ''), new.id,
            jsonb_build_object('type', 'assign', 'at', private.crm_iso(now()),
              'detail', case when new.assigned_to is null
                             then format('Unassigned (was %s) by %s', v_from, v_by)
                             else format('Assigned to %s (was %s) by %s', v_to, v_from, v_by) end),
            v_actor);
  end if;

  -- A demo is now linked: Mehdi's open demo requests on this lead are done,
  -- and whoever works the lead is told at once (the guard set it due now).
  if tg_op = 'UPDATE' and (new.data -> 'demoId') is distinct from (old.data -> 'demoId')
     and not private.crm_blank(new.data -> 'demoId') then
    update public.crm_requests r
       set resolved_at = now(), resolved_by = v_actor, outcome = 'done'
     where r.lead_id = new.id and r.kind = 'demo' and r.resolved_at is null;
    if new.assigned_to is not null and new.assigned_to is distinct from v_actor
       and private.crm_is_open(new.data ->> 'status') then
      insert into public.crm_notifications (member_id, kind, title, lead_id, actor_id)
      values (new.assigned_to, 'demo_ready',
              left(format('Demo ready for %s: turn the link on and send it', new.data ->> 'instituteName'), 300),
              new.id, v_actor);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists crm_leads_after on public.outreach_leads;
create trigger crm_leads_after
  after insert or update or delete on public.outreach_leads
  for each row execute function private.crm_leads_after();


-- ── 16. History lines: the writer and the time are the server's ────────────
create or replace function private.crm_events_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_role   text;
  v_type   text := coalesce(nullif(new.data ->> 'type', ''), 'note');
  v_at     timestamptz;
  v_status text;
  v_vals   text[];
  k        text;
  v        jsonb;
begin
  if octet_length(coalesce(new.data, '{}'::jsonb)::text) > 20000 then
    raise exception 'crm: that history line is too long' using errcode = '22001';
  end if;
  if current_user in ('anon', 'authenticated') then
    v_role := private.crm_role();
    if v_role is null then
      raise exception 'crm: you do not have access to the CRM' using errcode = '42501';
    end if;
    if jsonb_typeof(coalesce(new.data, '{}'::jsonb)) <> 'object' then
      raise exception 'crm: a history line must be a JSON object' using errcode = '22023';
    end if;
    new.actor_id   := private.crm_member_id();   -- nobody writes a line in someone else's name
    new.created_at := now();
    v_at := now();
    if v_type = 'demo_opened' then
      -- When the PROSPECT opened it (the open row's time), within reason.
      v_at := private.crm_ts(new.data ->> 'at');
      if v_at is null or v_at > now() or v_at < now() - interval '30 days' then
        v_at := now();
      end if;
    end if;
    if v_role <> 'owner' then
      if octet_length(coalesce(new.data, '{}'::jsonb)::text) > 4000 then
        raise exception 'crm: that history line is too long (4 KB at most)' using errcode = '22001';
      end if;
      if v_type not in ('sent', 'replied', 'status', 'note', 'call', 'demo_opened') then
        raise exception 'crm: the CRM writes "%" lines itself', v_type using errcode = '42501';
      end if;
      -- Every field of the line is text, and a coded one comes from its list:
      -- a list or a number where text belongs would break the history and the
      -- numbers for everyone, and could slip past the two tests below.
      for k, v in select e.key, e.value from jsonb_each(new.data) e loop
        continue when jsonb_typeof(v) = 'null';
        if jsonb_typeof(v) <> 'string' then
          raise exception 'crm: "%" on a history line must be text', k using errcode = '22023';
        end if;
        v_vals := private.crm_event_values(k);
        if v_vals is not null and not ((v #>> '{}') = any (v_vals)) then
          raise exception 'crm: "%" on a history line must be one of: %', k, array_to_string(v_vals, ', ')
            using errcode = '22023';
        end if;
      end loop;
      -- The dashboard counts a win from a "... to Won" line (metrics.ts isWinEvent).
      if v_type = 'status' and coalesce(new.data ->> 'detail', '') ~* '\mto\s+(won|proposal)\s*$' then
        raise exception 'crm: only Mehdi moves a lead to Proposal or Won' using errcode = '42501';
      end if;
      -- Money is never delegated (SOP-10): the after-call summary carries the
      -- price and the payment terms, and the proposal is Mehdi's.
      if v_type = 'sent'
         and (coalesce(new.data ->> 'stage', '') in ('after_call', 'proposal')
              or coalesce(new.data ->> 'templateId', '') ~ '^(wa|em)_(after_call|proposal)(_|$)') then
        raise exception 'crm: the after-call summary and the proposal are Mehdi''s (they carry the price). Hand the lead to him.'
          using errcode = '42501';
      end if;
      perform private.crm_spend('event');
    end if;
    new.data := new.data || jsonb_build_object('at', private.crm_iso(v_at));
  else
    new.created_at := coalesce(new.created_at, now());
  end if;
  new.data := coalesce(new.data, '{}'::jsonb)
              || jsonb_build_object('id', new.id, 'leadId', new.lead_id, 'type', v_type);
  if v_type = 'sent' then
    select l.data ->> 'status' into v_status from public.outreach_leads l where l.id = new.lead_id;
    if v_status = 'do_not_contact' then
      raise exception 'crm: this lead asked not to be contacted. Nothing may be sent.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists crm_events_guard on public.outreach_events;
create trigger crm_events_guard
  before insert on public.outreach_events
  for each row execute function private.crm_events_guard();

-- Unassigned means "nobody has written to it". The first send, call, reply or
-- stage change Mehdi (or an admin) logs on an Unassigned lead makes it theirs,
-- so a share-out can never hand an intern a school he is already talking to.
-- Quiet: his own line already says what happened; the audit keeps the move.
create or replace function private.crm_events_after()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := private.crm_member_id();
begin
  if coalesce(new.data ->> 'type', '') in ('sent', 'call', 'replied', 'status')
     and v_me is not null and new.actor_id = v_me
     and private.crm_role() in ('owner', 'admin') then
    perform set_config('crm.quiet_assign', 'on', true);
    update public.outreach_leads l set assigned_to = v_me
     where l.id = new.lead_id and l.assigned_to is null;
    perform set_config('crm.quiet_assign', '', true);
  end if;
  return null;
end $$;

drop trigger if exists crm_events_after on public.outreach_events;
create trigger crm_events_after
  after insert on public.outreach_events
  for each row execute function private.crm_events_after();


-- ── 17. The team table keeps itself honest ──────────────────────────────────
create or replace function private.crm_members_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.email        := lower(btrim(new.email));
  new.display_name := btrim(new.display_name);
  if new.role = 'owner' and not exists (select 1 from public.admins a where lower(a.email) = new.email) then
    raise exception 'crm: the owner is whoever is in public.admins (0005), and % is not', new.email
      using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    -- The login was deleted in the dashboard: the person is switched off.
    if old.user_id is not null and new.user_id is null then
      new.active := false;
    end if;
    if new.active and not old.active then
      new.deactivated_at := null;
    elsif not new.active and old.active then
      new.deactivated_at := coalesce(new.deactivated_at, now());
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists crm_members_guard on public.crm_members;
create trigger crm_members_guard
  before insert or update on public.crm_members
  for each row execute function private.crm_members_guard();

create or replace function private.crm_members_after()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_action  text;
  k         text;
  v_old     jsonb;
  v_new     jsonb;
begin
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old) - array['updated_at', 'last_seen_at'];
    v_new := to_jsonb(new) - array['updated_at', 'last_seen_at'];
    for k in select jsonb_object_keys(v_new) loop
      if (v_old -> k) is distinct from (v_new -> k) then
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_array(v_old -> k, v_new -> k));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return null;   -- "last seen" ticks are not audit events
    end if;
    -- Switched off (by the owner, or by deleting the login), and
    -- crm_deactivate_member has not moved their open leads: the ones nobody
    -- has written to go back to the pool (Unassigned); the ones already in a
    -- conversation go to Mehdi, so the pool stays "never written to".
    if old.active and not new.active then
      update public.outreach_leads l
         set assigned_to = case when coalesce(l.data ->> 'status', 'new') = 'new' then null
                                else private.crm_default_host() end
       where l.assigned_to = new.id and private.crm_is_open(l.data ->> 'status');
    end if;
  end if;
  v_action := case
    when tg_op = 'INSERT' then 'member.add'
    when tg_op = 'DELETE' then 'member.delete'
    when old.user_id is not null and new.user_id is null then 'member.unlink'   -- the login was deleted
    when old.user_id is null and new.user_id is not null then 'member.link'
    when old.active and not new.active then 'member.deactivate'
    when not old.active and new.active then 'member.reactivate'
    else 'member.update' end;
  insert into public.crm_audit (actor_id, actor_user, actor_email, action, member_id, detail)
  values (private.crm_member_id(), auth.uid(), auth.jwt() ->> 'email', v_action,
          case when tg_op = 'DELETE' then old.id else new.id end,
          case when tg_op = 'UPDATE' then v_changes
               when tg_op = 'INSERT' then to_jsonb(new) - array['created_at', 'updated_at', 'last_seen_at']
               else to_jsonb(old) - array['created_at', 'updated_at', 'last_seen_at'] end);
  return null;
end $$;

drop trigger if exists crm_members_after on public.crm_members;
create trigger crm_members_after
  after insert or update or delete on public.crm_members
  for each row execute function private.crm_members_after();


-- ── 18. Reviews and rules keep themselves honest ────────────────────────────
-- A review is about the line's writer, whatever the request said.
create or replace function private.crm_reviews_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_lead  text;
begin
  select e.actor_id, e.lead_id into v_actor, v_lead from public.outreach_events e where e.id = new.event_id;
  if v_actor is null then
    raise exception 'crm: that history line has no writer to review' using errcode = '22023';
  end if;
  new.member_id   := v_actor;
  new.lead_id     := v_lead;
  new.reviewer_id := coalesce(private.crm_member_id(), new.reviewer_id);
  if tg_op = 'INSERT' and new.verdict = 'fix' and new.member_id is distinct from new.reviewer_id then
    insert into public.crm_notifications (member_id, kind, title, lead_id, actor_id)
    values (new.member_id, 'review',
            left(format('%s asked you to fix something: %s', private.crm_name(new.reviewer_id, 'Mehdi'),
                        coalesce(nullif(btrim(new.comment), ''), 'see the review')), 300),
            new.lead_id, new.reviewer_id);
  end if;
  return new;
end $$;

drop trigger if exists crm_reviews_guard on public.crm_reviews;
create trigger crm_reviews_guard
  before insert or update on public.crm_reviews
  for each row execute function private.crm_reviews_guard();

create or replace function private.crm_rules_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from unnest(new.member_ids) as x(id)
              where not exists (select 1 from public.crm_members m where m.id = x.id)) then
    raise exception 'crm: a rule names someone who is not in the team' using errcode = '22023';
  end if;
  new.city := nullif(btrim(new.city), '');
  new.updated_at := now();
  if new.next_index < 0 or new.next_index >= cardinality(new.member_ids) then
    new.next_index := 0;
  end if;
  return new;
end $$;

drop trigger if exists crm_rules_guard on public.crm_assignment_rules;
create trigger crm_rules_guard
  before insert or update on public.crm_assignment_rules
  for each row execute function private.crm_rules_guard();


-- ── 19. Functions anyone in the team calls (each checks the caller) ─────────

-- Who am I? Links an invited row to this login on the first sign-in (by the
-- login's CONFIRMED e-mail), creates the owner's row if it is missing, and
-- notes when the person was last seen. Never raises for a stranger.
create or replace function public.crm_me()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := auth.uid();
  v_owner boolean := public.is_admin();
  v_email text;
  v_conf  timestamptz;
  m       public.crm_members%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('role', null, 'reason', 'signed_out');
  end if;
  select * into m from public.crm_members where user_id = v_uid;
  if m.id is null then
    select lower(u.email), u.email_confirmed_at into v_email, v_conf from auth.users u where u.id = v_uid;
    if v_email is not null and v_owner then
      -- The owner's row, even one switched off when an old login was deleted.
      update public.crm_members
         set user_id = v_uid, active = true, joined_at = coalesce(joined_at, now())
       where email = v_email and user_id is null and role = 'owner'
      returning * into m;
    elsif v_email is not null and v_conf is not null then
      update public.crm_members
         set user_id = v_uid, joined_at = coalesce(joined_at, now())
       where email = v_email and user_id is null and active and role <> 'owner'
      returning * into m;
    end if;
    if m.id is null and v_owner and v_email is not null then
      insert into public.crm_members (user_id, email, display_name, role, view_all, can_add_leads,
                                      wa_daily_limit, new_lead_cap, may_cold_call, sender_checked_at,
                                      must_change_password, joined_at)
      values (v_uid, v_email, initcap(split_part(v_email, '@', 1)), 'owner', true, true, null, 1000, true, now(), false, now())
      on conflict do nothing
      returning * into m;
    end if;
  end if;
  if m.id is null then
    return jsonb_build_object('role', null, 'reason', 'not_a_member');
  end if;
  if not m.active then
    return jsonb_build_object('role', null, 'reason', 'deactivated', 'displayName', m.display_name);
  end if;
  if m.role = 'owner' and not v_owner then
    return jsonb_build_object('role', null, 'reason', 'not_a_member');
  end if;
  update public.crm_members
     set last_seen_at = now(), joined_at = coalesce(joined_at, now())
   where id = m.id and (last_seen_at is null or last_seen_at < now() - interval '1 minute' or joined_at is null);
  return jsonb_build_object(
    'memberId', m.id,
    'role', case when v_owner then 'owner' else m.role end,
    'email', m.email,
    'displayName', m.display_name,
    'viewAll', v_owner or m.role = 'admin' or m.view_all,
    'canAddLeads', v_owner or m.role = 'admin' or m.can_add_leads,
    'waDailyLimit', m.wa_daily_limit,
    'newLeadCap', m.new_lead_cap,
    'mayColdCall', v_owner or m.may_cold_call,
    'targets', m.targets,
    'senderName', m.sender_name,
    'senderPhone', m.sender_phone,
    'senderChecked', v_owner or m.sender_checked_at is not null,
    'signature', m.signature,
    -- "Tell Mehdi on WhatsApp" after a hand-over or Ask Mehdi: his own number.
    'hostWhatsapp', (select h.sender_phone from public.crm_members h where h.id = private.crm_default_host()),
    'mustChangePassword', m.must_change_password and not v_owner);
end $$;

-- After "Set your own password" on the first sign-in.
create or replace function public.crm_password_changed()
returns void language sql security definer set search_path = '' as $$
  update public.crm_members set must_change_password = false
   where user_id = auth.uid() and must_change_password
$$;

-- Names for "Assigned to ..." labels and history lines. No e-mails. The owner
-- and admins get the whole team; a member gets Mehdi and the admins (whom
-- they hand leads to), themselves, and the people named on their own leads
-- and history: not the roster of who else works here.
create or replace function public.crm_team()
returns table (id uuid, display_name text, role text, active boolean)
language sql stable security definer set search_path = '' as $$
  with me as (select private.crm_role() as role, private.crm_member_id() as id)
  select m.id, m.display_name, m.role, m.active
    from public.crm_members m, me
   where me.role is not null
     and (me.role in ('owner', 'admin')
          or m.id = me.id
          or (m.role in ('owner', 'admin') and m.active)
          or exists (select 1 from public.outreach_leads l
                      where l.assigned_to = me.id
                        and m.id in (l.created_by, l.assigned_by, l.qualified_by))
          or exists (select 1 from public.outreach_events e
                       join public.outreach_leads l on l.id = e.lead_id
                      where l.assigned_to = me.id and e.actor_id = m.id))
   order by m.active desc, m.display_name
$$;

-- "Is this phone or e-mail already a lead?" across the whole team. Answers the
-- institute's name, whose it is, and whether the caller may open it; never a
-- contact. Counts against the caller's daily budget, so it cannot be used to
-- sweep through numbers.
create or replace function public.crm_find_duplicate(p_phone text default null, p_email text default null, p_exclude text default null)
returns table (lead_id text, institute_name text, assignee_name text, visible boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_role text := private.crm_role();
  v_me   uuid := private.crm_member_id();
begin
  if v_role is null then
    return;
  end if;
  perform private.crm_spend('lookup');
  return query
    select d.lead_id, d.institute_name, d.assignee_name,
           coalesce(v_role in ('owner', 'admin')
                    or private.crm_member_reads(d.assigned_to, d.status, d.closed_at, v_me), false)
      from private.crm_duplicate_of(p_phone, p_phone, p_email, p_exclude) d;
end $$;

-- The demo records linked to the leads the caller may work (drafts included,
-- which a member cannot read in public.content).
create or replace function public.crm_lead_demos()
returns table (demo_id text, data jsonb)
language sql stable security definer set search_path = '' as $$
  with me as (select private.crm_role() as role, private.crm_member_id() as id),
  mine as (
    select l.data ->> 'demoId' as demo_id, l.data ->> 'demoSlug' as demo_slug
      from public.outreach_leads l, me
     where me.role is not null
       and (me.role in ('owner', 'admin')
            or private.crm_member_reads(l.assigned_to, l.data ->> 'status', l.closed_at, me.id))
       and (l.data ? 'demoId' or l.data ? 'demoSlug')
  )
  select c.doc_id, c.data
    from public.content c
   where c.collection = 'demoSites'
     and (c.doc_id in (select demo_id from mine where demo_id is not null)
          or c.data ->> 'slug' in (select demo_slug from mine where demo_slug is not null))
$$;

-- Demo opens for those demos only (public.content's demoSiteOpens rows are
-- owner-only since 0004/0005): a member's Hot list.
create or replace function public.crm_demo_opens(p_since timestamptz default now() - interval '180 days')
returns table (open_id text, demo_id text, opened_at text)
language sql stable security definer set search_path = '' as $$
  select c.doc_id, c.data ->> 'demoId', c.data ->> 'at'
    from public.content c
   where c.collection = 'demoSiteOpens'
     and c.updated_at >= p_since
     and (c.data ->> 'demoId') in (select d.demo_id from public.crm_lead_demos() d)
$$;

-- A read-only list WITHOUT contact details: every lead for the owner, admins
-- and members with "See all leads"; for any member, also the leads they handed
-- over (qualified_by), so they can follow their calls.
create or replace function public.crm_leads_overview()
returns table (id text, institute_name text, kind text, city text, status text,
               assigned_to uuid, assignee_name text, qualified_by uuid,
               created_at text, updated_at timestamptz, next_action_at text, last_contacted_at text)
language sql stable security definer set search_path = '' as $$
  select l.id, l.data ->> 'instituteName', l.data ->> 'kind', l.data ->> 'city', l.data ->> 'status',
         l.assigned_to, m.display_name, l.qualified_by,
         l.data ->> 'createdAt', l.updated_at, l.data ->> 'nextActionAt', l.data ->> 'lastContactedAt'
    from public.outreach_leads l
    left join public.crm_members m on m.id = l.assigned_to
   where (select private.crm_role()) is not null
     and ((select private.crm_view_all())
          or l.qualified_by = (select private.crm_member_id()))
   order by l.updated_at desc nulls last
$$;

-- Numbers per person between p_from and p_to, from the server's own history
-- (writer and time stamped by the database). The owner and admins get every
-- member; a member gets their own row. One function, so the member's home and
-- the owner's team dashboard always agree.
create or replace function public.crm_activity_stats(p_from timestamptz, p_to timestamptz default now())
returns table (member_id uuid, display_name text, role text, active boolean,
               first_whatsapp integer, first_email integer, follow_ups integer,
               calls integer, calls_connected integer, replies integer, handoffs integer, notes integer,
               unanswered_first_whatsapp integer,
               open_leads integer, new_leads integer, overdue integer, untouched integer, won_credited integer,
               handoffs_confirmed integer,
               last_active_at timestamptz, last_seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with me as (
    select private.crm_role() as role, private.crm_member_id() as id
  ),
  team as (
    select m.* from public.crm_members m, me
     where me.role is not null and (me.role in ('owner', 'admin') or m.id = me.id)
  ),
  ev as (
    select e.actor_id, e.lead_id, e.created_at,
           e.data ->> 'type' as type,
           e.data ->> 'channel' as channel,
           coalesce(e.data ->> 'stage',
                    case when e.data ->> 'templateId' ~ '^(wa|em)_first_' then 'first' end) as stage,
           e.data ->> 'outcome' as outcome
      from public.outreach_events e
     where e.created_at >= p_from and e.created_at < p_to
       and e.actor_id in (select t.id from team t)
  ),
  agg as (
    select ev.actor_id,
           count(*) filter (where ev.type = 'sent' and ev.channel = 'whatsapp' and ev.stage = 'first') as first_whatsapp,
           count(*) filter (where ev.type = 'sent' and ev.channel = 'email' and ev.stage = 'first') as first_email,
           count(*) filter (where ev.type = 'sent' and ev.stage is distinct from 'first') as follow_ups,
           count(*) filter (where ev.type = 'call') as calls,
           count(*) filter (where ev.type = 'call' and ev.outcome like 'connected%') as calls_connected,
           count(*) filter (where ev.type = 'replied') as replies,
           count(*) filter (where ev.type = 'handoff') as handoffs,
           count(*) filter (where ev.type = 'note') as notes,
           count(*) filter (where ev.type = 'sent' and ev.channel = 'whatsapp' and ev.stage = 'first'
                              and not exists (select 1 from public.outreach_events r
                                               where r.lead_id = ev.lead_id and r.data ->> 'type' = 'replied'
                                                 and r.created_at > ev.created_at)) as unanswered,
           max(ev.created_at) as last_active_at
      from ev
     group by ev.actor_id
  ),
  day0 as (
    select (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as start
  ),
  load as (
    select l.assigned_to,
           count(*) filter (where private.crm_is_open(l.data ->> 'status')) as open_leads,
           count(*) filter (where coalesce(l.data ->> 'status', 'new') = 'new') as new_leads,
           count(*) filter (where private.crm_is_open(l.data ->> 'status')
                              and private.crm_ts(l.data ->> 'nextActionAt') < (select d.start from day0 d)) as overdue,
           count(*) filter (where private.crm_is_open(l.data ->> 'status')
                              and l.assigned_at < now() - interval '24 hours'
                              and not exists (select 1 from public.outreach_events x
                                               where x.lead_id = l.id and x.actor_id = l.assigned_to
                                                 and x.created_at >= l.assigned_at)) as untouched
      from public.outreach_leads l
     where l.assigned_to in (select t.id from team t)
     group by l.assigned_to
  ),
  credit as (
    select l.qualified_by, count(*) filter (where l.data ->> 'status' = 'won') as won
      from public.outreach_leads l
     where l.qualified_by in (select t.id from team t)
     group by l.qualified_by
  ),
  -- Hand-overs Mehdi marked "accepted" in the period: stamped by him, not by
  -- the intern, so the one number here that cannot be typed in.
  confirmed as (
    select r.asked_by, count(*) as n
      from public.crm_requests r
     where r.kind = 'handoff' and r.outcome = 'accepted'
       and r.resolved_at >= p_from and r.resolved_at < p_to
       and r.asked_by in (select t.id from team t)
     group by r.asked_by
  )
  select t.id, t.display_name, t.role, t.active,
         coalesce(a.first_whatsapp, 0)::integer, coalesce(a.first_email, 0)::integer,
         coalesce(a.follow_ups, 0)::integer, coalesce(a.calls, 0)::integer,
         coalesce(a.calls_connected, 0)::integer, coalesce(a.replies, 0)::integer,
         coalesce(a.handoffs, 0)::integer, coalesce(a.notes, 0)::integer,
         coalesce(a.unanswered, 0)::integer,
         coalesce(ld.open_leads, 0)::integer, coalesce(ld.new_leads, 0)::integer, coalesce(ld.overdue, 0)::integer,
         coalesce(ld.untouched, 0)::integer, coalesce(c.won, 0)::integer,
         coalesce(cf.n, 0)::integer,
         a.last_active_at, t.last_seen_at
    from team t
    left join agg a on a.actor_id = t.id
    left join load ld on ld.assigned_to = t.id
    left join credit c on c.qualified_by = t.id
    left join confirmed cf on cf.asked_by = t.id
   order by (t.role = 'owner') desc, t.active desc, t.display_name
$$;

-- "Who looked": the app logs a lead page opened by an admin or a member, a
-- contact revealed (phase 2), and every export and import. Reads cannot fire
-- triggers, so this is how access is made visible (DPDP Rules 2025, r.6(c)).
create or replace function public.crm_log_access(p_action text, p_lead_id text default null, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_hdr  json;
  v_me   uuid;
  v_lead text;
  v_role text := private.crm_role();
begin
  if v_role is null then
    raise exception 'crm: you do not have access to the CRM' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('lead.view', 'contact.reveal', 'export', 'import', 'sign_in') then
    raise exception 'crm: unknown access to log' using errcode = '22023';
  end if;
  if p_detail is not null and jsonb_typeof(p_detail) <> 'object' then
    raise exception 'crm: the detail must be a JSON object' using errcode = '22023';
  end if;
  -- The log cannot be used to fill the database (crm_log_detail_max).
  if octet_length(coalesce(p_detail, '{}'::jsonb)::text) > private.crm_log_detail_max(v_role = 'owner') then
    raise exception 'crm: detail too long' using errcode = '22001';
  end if;
  perform private.crm_spend('log');
  -- The log is evidence: a line names a lead only when the caller can open it
  -- (their own, or a See-all or handed-over overview row). Anything else is
  -- kept as a flagged claim, which the owner's Access tab shows.
  if p_lead_id is not null then
    v_me := private.crm_member_id();
    select l.id into v_lead from public.outreach_leads l
     where l.id = p_lead_id
       and (private.crm_role() in ('owner', 'admin')
            or private.crm_member_reads(l.assigned_to, l.data ->> 'status', l.closed_at, v_me)
            or private.crm_view_all()
            or l.qualified_by = v_me);
  end if;
  begin
    v_hdr := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_hdr := null;
  end;
  insert into public.crm_audit (actor_id, actor_user, actor_email, action, lead_id, detail)
  values (private.crm_member_id(), auth.uid(), auth.jwt() ->> 'email', p_action, v_lead,
          coalesce(p_detail, '{}'::jsonb)
          || case when p_lead_id is not null and v_lead is null
                  then jsonb_build_object('flag', 'not_visible', 'claimedLeadId', left(p_lead_id, 100))
                  else '{}'::jsonb end
          || jsonb_strip_nulls(jsonb_build_object(
            'ip', v_hdr ->> 'x-forwarded-for',
            'agent', left(v_hdr ->> 'user-agent', 200))));
end $$;

-- "Add to notes" for everyone, merged ON THE SERVER from the row as it is now,
-- so an addition never overwrites what someone else wrote a second earlier.
-- SECURITY INVOKER: RLS and the field guard apply (for a member the notes may
-- only grow, which this always does).
create or replace function public.crm_append_notes(p_id text, p_text text)
returns setof public.outreach_leads
language plpgsql security invoker set search_path = '' as $$
declare
  v      public.outreach_leads%rowtype;
  v_text text := left(btrim(coalesce(p_text, '')), 2000);
begin
  if v_text = '' then
    raise exception 'crm: write something to add' using errcode = '22023';
  end if;
  update public.outreach_leads l
     set data = l.data || jsonb_build_object('notes',
           case when private.crm_blank(l.data -> 'notes') then v_text
                else (l.data ->> 'notes') || E'\n' || v_text end)
   where l.id = p_id
  returning l.* into v;
  if not found then
    raise exception 'crm: this lead is not yours, or it was deleted' using errcode = 'P0002';
  end if;
  return next v;
end $$;

-- A change to a lead, merged ON THE SERVER: two people editing different
-- fields of one lead no longer overwrite each other. SECURITY INVOKER: RLS and
-- the field guard apply exactly as to a direct update. Raises when the lead is
-- not the caller's (a plain update would touch 0 rows silently).
create or replace function public.crm_patch_lead(p_id text, p_set jsonb default '{}'::jsonb, p_unset text[] default '{}'::text[])
returns setof public.outreach_leads
language plpgsql security invoker set search_path = '' as $$
declare
  v public.outreach_leads%rowtype;
begin
  if p_set is null or jsonb_typeof(p_set) <> 'object' then
    raise exception 'crm: the change must be a JSON object' using errcode = '22023';
  end if;
  update public.outreach_leads l
     set data = (l.data || p_set) - coalesce(p_unset, '{}'::text[])
   where l.id = p_id
  returning l.* into v;
  if not found then
    raise exception 'crm: this lead is not yours, or it was deleted' using errcode = 'P0002';
  end if;
  return next v;
end $$;

-- Turns on the public link of the demo linked to the caller's lead (a demo's
-- link works only once it is "sent", and members cannot write the CMS). Same
-- effect as markDemoSent in src/admin/outreach/demoActions.ts. A demo the
-- owner closed stays closed.
create or replace function public.crm_publish_lead_demo(p_lead_id text, p_sent_to text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_role   text := private.crm_role();
  v_me     uuid := private.crm_member_id();
  l        public.outreach_leads%rowtype;
  d        public.content%rowtype;
  v_status text;
  v_to     text;
begin
  if v_role is null then
    raise exception 'crm: you do not have access to the CRM' using errcode = '42501';
  end if;
  select * into l from public.outreach_leads where id = p_lead_id;
  if l.id is null or not (v_role in ('owner', 'admin') or l.assigned_to = v_me) then
    raise exception 'crm: this lead is not yours' using errcode = '42501';
  end if;
  if l.data ->> 'status' = 'do_not_contact' then
    raise exception 'crm: this lead asked not to be contacted' using errcode = '42501';
  end if;
  if v_role = 'member' and not private.crm_is_open(l.data ->> 'status') then
    raise exception 'crm: this lead is closed. Ask Mehdi before sending anything.' using errcode = '42501';
  end if;
  select * into d from public.content c
   where c.collection = 'demoSites'
     and (c.doc_id = l.data ->> 'demoId'
          or (l.data ->> 'demoId' is null and c.data ->> 'slug' = l.data ->> 'demoSlug'))
   limit 1;
  if d.id is null then
    raise exception 'crm: this lead has no demo yet. Ask Mehdi for one.' using errcode = 'P0002';
  end if;
  v_status := coalesce(d.data ->> 'status', 'draft');
  if v_status = 'closed' then
    raise exception 'crm: Mehdi closed this demo. Ask him before sending it.' using errcode = '42501';
  end if;
  if v_status <> 'sent' then
    v_to := left(coalesce(nullif(btrim(p_sent_to), ''), l.data ->> 'contactName', l.data ->> 'instituteName'), 200);
    update public.content set data = data || '{"status": "sent"}'::jsonb, updated_at = now() where id = d.id;
    insert into public.content as c (collection, doc_id, data)
    values ('demoSiteSlots', d.doc_id,
            jsonb_build_object('id', d.doc_id, 'sentTo', v_to, 'sentAt', private.crm_iso(now())))
    on conflict (collection, doc_id) do update
      set data = c.data || jsonb_build_object('sentTo', v_to, 'sentAt', private.crm_iso(now())),
          updated_at = now();
    insert into public.outreach_events (id, lead_id, data, actor_id)
    values ('oe_dm_' || replace(gen_random_uuid()::text, '-', ''), l.id,
            jsonb_build_object('type', 'note', 'at', private.crm_iso(now()),
                               'detail', format('Demo /site/%s marked sent', d.data ->> 'slug')),
            v_me);
  end if;
  return d.data ->> 'slug';
end $$;

-- Phase 2: the host's booked times (no lead, no names), so a member offers free ones.
create or replace function public.crm_busy_slots(p_host uuid default null, p_days integer default 14)
returns table (slot_at timestamptz, minutes integer)
language sql stable security definer set search_path = '' as $$
  select b.slot_at, b.minutes
    from public.crm_bookings b
   where (select private.crm_role()) is not null
     and b.status = 'booked'
     and b.host_id = coalesce(p_host, (select private.crm_default_host()))
     and b.slot_at >= now()
     and b.slot_at < now() + make_interval(days => least(greatest(coalesce(p_days, 14), 1), 60))
   order by b.slot_at
$$;

-- "Hand to Mehdi". The member (or an admin) passes a lead to the host (Mehdi
-- by default) in one step, with a note. With p_slot_at ("Book a call with
-- Mehdi": Mehdi and admins now, members in phase 2) it also books that free
-- 15-minute slot and moves the lead to stage Call. A qualified hand-over
-- keeps the member's credit (qualified_by),
-- and they follow the outcome in crm_leads_overview; p_qualified false is
-- "give it back" (wrong number, not a fit). This is the ONE way a member's
-- lead leaves them, and it always goes to the owner or an admin.
create or replace function public.crm_handoff(p_lead_id text, p_slot_at timestamptz default null,
                                              p_note text default null, p_host uuid default null,
                                              p_qualified boolean default true)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_role  text := private.crm_role();
  v_me    uuid := private.crm_member_id();
  v_host  uuid := coalesce(p_host, private.crm_default_host());
  l       public.outreach_leads%rowtype;
  v_local timestamp := p_slot_at at time zone 'Asia/Kolkata';
  v_note  text := left(nullif(btrim(p_note), ''), 500);
  v_id    bigint;
  v_when  text;
begin
  if v_role is null then
    raise exception 'crm: you do not have access to the CRM' using errcode = '42501';
  end if;
  select * into l from public.outreach_leads where id = p_lead_id for update;
  if l.id is null or not (v_role in ('owner', 'admin') or l.assigned_to = v_me) then
    raise exception 'crm: this lead is not yours' using errcode = '42501';
  end if;
  if coalesce(l.data ->> 'status', 'new') in ('proposal', 'won', 'lost', 'do_not_contact') then
    raise exception 'crm: a lead at this stage is not handed over' using errcode = '22023';
  end if;
  if not exists (select 1 from public.crm_members m where m.id = v_host and m.active and m.role in ('owner', 'admin')) then
    raise exception 'crm: leads are handed to Mehdi or an admin' using errcode = '22023';
  end if;
  -- A member booking Mehdi's time is phase 2: it waits for the booking sentence
  -- he approves and for a cap on the calls one person may book. Until then a
  -- member hands over without a time and Mehdi sets the call.
  if p_slot_at is not null and v_role = 'member' then
    raise exception 'crm: booking a call time comes later. Hand the lead over without a time; Mehdi sets the call.'
      using errcode = '42501';
  end if;
  perform private.crm_spend('event');
  if p_slot_at is not null then
    if p_slot_at < now() + interval '30 minutes' or p_slot_at > now() + interval '30 days'
       or extract(isodow from v_local) = 7
       or v_local::time < time '10:00' or v_local::time > time '20:45'
       or extract(minute from v_local)::integer % 15 <> 0 or extract(second from v_local) <> 0 then
      raise exception 'crm: pick a time on the quarter hour, 10:00 to 20:45 India time, Monday to Saturday, in the next 30 days'
        using errcode = '22023';
    end if;
    begin
      insert into public.crm_bookings (lead_id, host_id, booked_by, slot_at, note)
      values (l.id, v_host, v_me, p_slot_at, v_note)
      returning id into v_id;
    exception when unique_violation then
      raise exception 'crm: that time was just taken. Pick another.' using errcode = '23505';
    end;
    v_when := to_char(v_local, 'Dy DD Mon, HH12:MI AM');
  end if;
  perform set_config('crm.quiet_assign', 'on', true);
  update public.outreach_leads
     set assigned_to  = v_host,
         qualified_by = case when v_role = 'member' and coalesce(p_qualified, true) then v_me else qualified_by end,
         data = data || case when p_slot_at is not null
                             then jsonb_build_object('status', 'call', 'nextActionAt', private.crm_iso(p_slot_at))
                             else jsonb_build_object('nextActionAt', private.crm_iso(now())) end
                     || jsonb_build_object('updatedAt', private.crm_iso(now()))
   where id = l.id;
  perform set_config('crm.quiet_assign', '', true);
  insert into public.outreach_events (id, lead_id, data, actor_id)
  values ('oe_ho_' || replace(gen_random_uuid()::text, '-', ''), l.id,
          jsonb_build_object('type', 'handoff', 'at', private.crm_iso(now()),
            'detail', case when p_slot_at is not null
                           then format('Call booked with %s for %s (India time). Handed over by %s.',
                                       private.crm_name(v_host, 'Mehdi'), v_when, private.crm_name(v_me, 'Mehdi'))
                           when coalesce(p_qualified, true)
                           then format('Handed over to %s by %s.', private.crm_name(v_host, 'Mehdi'), private.crm_name(v_me, 'Mehdi'))
                           else format('Given back to %s by %s.', private.crm_name(v_host, 'Mehdi'), private.crm_name(v_me, 'Mehdi'))
                      end || coalesce(' Note: ' || v_note, '')),
          v_me);
  if v_host is distinct from v_me then
    -- Open until the host marks it: "accepted" (a real lead) or "not real".
    insert into public.crm_requests (lead_id, kind, asked_by, host_id, body)
    values (l.id, case when coalesce(p_qualified, true) then 'handoff' else 'give_back' end, v_me, v_host, v_note);
    insert into public.crm_notifications (member_id, kind, title, lead_id, actor_id)
    values (v_host, 'handoff',
            left(case when p_slot_at is not null
                      then format('%s booked a call with %s for %s', private.crm_name(v_me, 'Someone'), l.data ->> 'instituteName', v_when)
                      when coalesce(p_qualified, true)
                      then format('%s handed over %s', private.crm_name(v_me, 'Someone'), l.data ->> 'instituteName')
                      else format('%s gave back %s', private.crm_name(v_me, 'Someone'), l.data ->> 'instituteName')
                 end || coalesce(': ' || v_note, ''), 300),
            l.id, v_me);
  end if;
  return v_id;
end $$;

-- "Ask Mehdi" on a lead: a demo request, a correction (a wrong number, the
-- right principal) or a question. A history line on the lead, and a
-- notification to Mehdi. Members cannot change filled contact details, so
-- this is how a correction reaches him.
create or replace function public.crm_ask_owner(p_lead_id text, p_topic text, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role  text := private.crm_role();
  v_me    uuid := private.crm_member_id();
  v_host  uuid := private.crm_default_host();
  l       public.outreach_leads%rowtype;
  v_label text;
  v_text  text := left(nullif(btrim(p_text), ''), 500);
begin
  if v_role is null then
    raise exception 'crm: you do not have access to the CRM' using errcode = '42501';
  end if;
  select * into l from public.outreach_leads where id = p_lead_id;
  if l.id is null or not (v_role in ('owner', 'admin')
                          or private.crm_member_reads(l.assigned_to, l.data ->> 'status', l.closed_at, v_me)) then
    raise exception 'crm: this lead is not yours' using errcode = '42501';
  end if;
  perform private.crm_spend('event');
  v_label := case p_topic when 'demo' then 'Demo request' when 'correction' then 'Correction'
                          when 'question' then 'Question' end;
  if v_label is null or v_text is null then
    raise exception 'crm: say what you need (a demo, a correction or a question)' using errcode = '22023';
  end if;
  insert into public.outreach_events (id, lead_id, data, actor_id)
  values ('oe_ask_' || replace(gen_random_uuid()::text, '-', ''), l.id,
          jsonb_build_object('type', 'note', 'at', private.crm_iso(now()), 'topic', p_topic,
                             'detail', format('%s for %s: %s', v_label, private.crm_name(v_host, 'Mehdi'), v_text)),
          v_me);
  if v_host is not null and v_host is distinct from v_me then
    -- Open until Mehdi marks it done (linking a demo closes a demo request by itself).
    insert into public.crm_requests (lead_id, kind, asked_by, host_id, body)
    values (l.id, p_topic, v_me, v_host, v_text);
    insert into public.crm_notifications (member_id, kind, title, lead_id, actor_id)
    values (v_host, 'info',
            left(format('%s, %s on %s: %s', private.crm_name(v_me, 'Someone'), lower(v_label), l.data ->> 'instituteName', v_text), 300),
            l.id, v_me);
  end if;
end $$;


-- Mehdi (or the admin a request went to) closes a request from "Waiting on
-- you": 'done' or 'no_action' for an Ask Mehdi; 'accepted' (a real lead) or
-- 'not_real' for a hand-over. The person who asked is told.
create or replace function public.crm_resolve_request(p_id bigint, p_outcome text default 'done', p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role text := private.crm_role();
  v_me   uuid := private.crm_member_id();
  r      public.crm_requests%rowtype;
  v_word text;
begin
  select * into r from public.crm_requests where id = p_id for update;
  if r.id is null or v_role is null or not (v_role = 'owner' or (v_role = 'admin' and r.host_id = v_me)) then
    raise exception 'crm: only Mehdi, or the admin it went to, closes a request' using errcode = '42501';
  end if;
  if r.resolved_at is not null then
    return;   -- already closed (a second tap, or a demo link closed it)
  end if;
  if coalesce(p_outcome, '') not in ('done', 'accepted', 'not_real', 'no_action')
     or (r.kind in ('handoff', 'give_back') and p_outcome not in ('accepted', 'not_real', 'done'))
     or (r.kind not in ('handoff', 'give_back') and p_outcome not in ('done', 'no_action')) then
    raise exception 'crm: a hand-over is "accepted" or "not_real"; a question is "done" or "no_action"' using errcode = '22023';
  end if;
  update public.crm_requests
     set resolved_at = now(), resolved_by = v_me, outcome = p_outcome,
         outcome_note = left(nullif(btrim(p_note), ''), 500)
   where id = r.id;
  if r.asked_by is not null and r.asked_by is distinct from v_me then
    v_word := case p_outcome when 'accepted' then 'accepted' when 'not_real' then 'did not take'
                             when 'no_action' then 'closed' else 'did' end;
    insert into public.crm_notifications (member_id, kind, title, lead_id, actor_id)
    values (r.asked_by, 'resolved',
            left(format('%s %s your %s on %s%s', private.crm_name(v_me, 'Mehdi'), v_word,
                        case r.kind when 'demo' then 'demo request' when 'correction' then 'correction'
                                    when 'question' then 'question' when 'give_back' then 'give-back' else 'hand-over' end,
                        (select l.data ->> 'instituteName' from public.outreach_leads l where l.id = r.lead_id),
                        coalesce(': ' || left(nullif(btrim(p_note), ''), 200), '')), 300),
            r.lead_id, v_me);
  end if;
end $$;


-- ── 20. Functions for the owner and admins ──────────────────────────────────

-- Assign (or, with p_member null, unassign) leads. One notification per person.
create or replace function public.crm_assign_leads(p_lead_ids text[], p_member uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_role   text := private.crm_role();
  v_me     uuid := private.crm_member_id();
  v_new    integer;
  v_open   integer;
  v_mehdis integer;
  v_n      integer;
  v_one    text;
  v_name   text;
  v_prev   record;
begin
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'crm: only Mehdi or an admin can assign leads' using errcode = '42501';
  end if;
  if p_lead_ids is null or cardinality(p_lead_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_lead_ids) > 1000 then
    raise exception 'crm: assign at most 1,000 leads at a time' using errcode = '22023';
  end if;
  if p_member is not null then
    -- A member's queue of New leads has a cap, and Call and Proposal stay with Mehdi.
    select count(*) filter (where coalesce(l.data ->> 'status', 'new') = 'new'),
           count(*) filter (where private.crm_is_open(l.data ->> 'status')),
           count(*) filter (where l.data ->> 'status' in ('call', 'proposal'))
      into v_new, v_open, v_mehdis
      from public.outreach_leads l
     where l.id = any (p_lead_ids) and l.assigned_to is distinct from p_member;
    perform private.crm_check_assignee(p_member, v_new, v_open, v_mehdis);
  end if;
  for v_prev in
    select l.assigned_to as member_id, count(*) as n
      from public.outreach_leads l
     where l.id = any (p_lead_ids) and l.assigned_to is not null
       and l.assigned_to is distinct from p_member and l.assigned_to is distinct from v_me
     group by l.assigned_to
  loop
    insert into public.crm_notifications (member_id, kind, title, actor_id)
    values (v_prev.member_id, 'moved_away',
            format('%s moved %s of your leads to %s', private.crm_name(v_me, 'Mehdi'), v_prev.n,
                   case when p_member is null then 'the Unassigned list' else private.crm_name(p_member) end),
            v_me);
  end loop;
  with u as (
    update public.outreach_leads set assigned_to = p_member
     where id = any (p_lead_ids) and assigned_to is distinct from p_member
    returning id, data ->> 'instituteName' as name
  )
  select count(*), min(id), min(name) into v_n, v_one, v_name from u;
  if v_n > 0 and p_member is not null and p_member is distinct from v_me then
    insert into public.crm_notifications (member_id, kind, title, lead_id, actor_id)
    values (p_member, 'assigned',
            case when v_n = 1 then left(format('%s assigned you %s', private.crm_name(v_me, 'Mehdi'), v_name), 300)
                 else format('%s assigned you %s leads', private.crm_name(v_me, 'Mehdi'), v_n) end,
            case when v_n = 1 then v_one end, v_me);
  end if;
  return v_n;
end $$;

-- Share leads between people: 'balanced' gives each lead to whoever has the
-- fewest New leads waiting plus what this share-out already gave them (ties:
-- the order given); 'round_robin' deals them in turn. Only leads nobody has
-- written to (New) are shared out, unless p_include_contacted; leads at Call
-- or Proposal never are (they stay with Mehdi), and closed leads stay where
-- they are. Nobody passes their cap. Returns how many each person got; a row
-- with member_id null counts the leads left over because of caps. Leads
-- skipped by stage are not in the result (the preview lists them).
drop function if exists public.crm_distribute(text[], uuid[], text);
create or replace function public.crm_distribute(p_lead_ids text[], p_member_ids uuid[], p_mode text default 'balanced',
                                                 p_include_contacted boolean default false)
returns table (member_id uuid, assigned integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_role  text := private.crm_role();
  v_me    uuid := private.crm_member_id();
  v_ids   uuid[];
  v_cap   integer[];
  v_queue integer[];   -- New leads waiting (the capped number)
  v_open  integer[];   -- open leads held (the 1,000 ceiling)
  v_load  integer[];   -- the balance measure: the queue plus what this share-out gave
  v_got   integer[];
  v_n     integer;
  v_left  integer := 0;
  v_next  integer := 1;
  v_best  integer;
  v_isnew boolean;
  i       integer;
  j       integer;
  v_lead  record;
begin
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'crm: only Mehdi or an admin can share out leads' using errcode = '42501';
  end if;
  if coalesce(p_mode, '') not in ('balanced', 'round_robin') then
    raise exception 'crm: share out "balanced" or "round_robin"' using errcode = '22023';
  end if;
  if p_member_ids is null or cardinality(p_member_ids) = 0 then
    raise exception 'crm: pick at least one person' using errcode = '22023';
  end if;
  if cardinality(p_lead_ids) > 1000 then
    raise exception 'crm: share out at most 1,000 leads at a time' using errcode = '22023';
  end if;
  select array_agg(m.id order by o.ord),
         array_agg(case when m.role = 'member' then m.new_lead_cap else 1000000 end order by o.ord),
         array_agg((select count(*)::integer from public.outreach_leads l
                     where l.assigned_to = m.id and coalesce(l.data ->> 'status', 'new') = 'new'
                       and not (l.id = any (p_lead_ids))) order by o.ord),
         -- Open leads held; Mehdi and admins start far below the 1,000 ceiling (none for them).
         array_agg((select count(*)::integer from public.outreach_leads l
                     where l.assigned_to = m.id and private.crm_is_open(l.data ->> 'status')
                       and not (l.id = any (p_lead_ids))) + case when m.role = 'member' then 0 else -1000000 end
                   order by o.ord)
    into v_ids, v_cap, v_queue, v_open
    from (select distinct on (x.id) x.id, x.ord from unnest(p_member_ids) with ordinality as x(id, ord) order by x.id, x.ord) o
    join public.crm_members m on m.id = o.id and m.active;
  v_n := coalesce(cardinality(v_ids), 0);
  if v_n = 0 or v_n <> (select count(distinct x) from unnest(p_member_ids) x) then
    raise exception 'crm: everyone picked must be an active team member' using errcode = '22023';
  end if;
  v_load := v_queue;
  v_got  := array_fill(0, array[v_n]);
  for v_lead in
    select l.id, l.assigned_to, coalesce(l.data ->> 'status', 'new') as status from public.outreach_leads l
     where l.id = any (p_lead_ids) and private.crm_is_open(l.data ->> 'status')
       and coalesce(l.data ->> 'status', 'new') not in ('call', 'proposal')
       and (coalesce(l.data ->> 'status', 'new') = 'new' or coalesce(p_include_contacted, false))
     order by l.data ->> 'createdAt' nulls last, l.id
       for update
  loop
    v_isnew := v_lead.status = 'new';
    v_best := null;
    if p_mode = 'balanced' then
      for i in 1 .. v_n loop
        if (not v_isnew or v_queue[i] < v_cap[i]) and v_open[i] < 1000
           and (v_best is null or v_load[i] < v_load[v_best]) then
          v_best := i;
        end if;
      end loop;
    else
      for j in 0 .. v_n - 1 loop
        i := ((v_next - 1 + j) % v_n) + 1;
        if (not v_isnew or v_queue[i] < v_cap[i]) and v_open[i] < 1000 then
          v_best := i;
          v_next := (i % v_n) + 1;
          exit;
        end if;
      end loop;
    end if;
    if v_best is null then
      v_left := v_left + 1;
      continue;
    end if;
    if v_lead.assigned_to is distinct from v_ids[v_best] then
      update public.outreach_leads set assigned_to = v_ids[v_best] where id = v_lead.id;
    end if;
    if v_isnew then
      v_queue[v_best] := v_queue[v_best] + 1;
    end if;
    v_open[v_best] := v_open[v_best] + 1;
    v_load[v_best] := v_load[v_best] + 1;
    v_got[v_best]  := v_got[v_best] + 1;
  end loop;
  for i in 1 .. v_n loop
    if v_got[i] > 0 and v_ids[i] is distinct from v_me then
      insert into public.crm_notifications (member_id, kind, title, actor_id)
      values (v_ids[i], 'assigned', format('%s assigned you %s leads', private.crm_name(v_me, 'Mehdi'), v_got[i]), v_me);
    end if;
  end loop;
  return query
    select v_ids[s.i], v_got[s.i] from generate_subscripts(v_ids, 1) as s(i)
    union all
    select null::uuid, v_left where v_left > 0;
end $$;

-- Apply the assignment rules (by kind and city, round-robin inside each rule)
-- to these Unassigned open leads: New ones only, unless p_include_contacted;
-- never Call or Proposal. A lead no rule fits stays Unassigned.
drop function if exists public.crm_apply_rules(text[]);
create or replace function public.crm_apply_rules(p_lead_ids text[], p_include_contacted boolean default false)
returns table (member_id uuid, assigned integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_role  text := private.crm_role();
  v_me    uuid := private.crm_member_id();
  v_lead  record;
  v_rule  record;
  v_pick  uuid;
  v_cand  uuid;
  v_n     integer;
  i       integer;
  v_count jsonb := '{}'::jsonb;
  v_key   text;
begin
  if v_role is null or v_role not in ('owner', 'admin') then
    raise exception 'crm: only Mehdi or an admin can apply the rules' using errcode = '42501';
  end if;
  for v_lead in
    select l.id, l.data, coalesce(l.data ->> 'status', 'new') as status from public.outreach_leads l
     where l.id = any (p_lead_ids) and l.assigned_to is null and private.crm_is_open(l.data ->> 'status')
       and coalesce(l.data ->> 'status', 'new') not in ('call', 'proposal')
       and (coalesce(l.data ->> 'status', 'new') = 'new' or coalesce(p_include_contacted, false))
     order by l.data ->> 'createdAt' nulls last, l.id
       for update
  loop
    v_pick := null;
    for v_rule in
      select r.* from public.crm_assignment_rules r
       where r.active
         and (r.kind is null or r.kind = coalesce(v_lead.data ->> 'kind', 'other'))
         and (r.city is null or position(lower(r.city) in lower(coalesce(v_lead.data ->> 'city', ''))) > 0)
       order by r.priority, r.id
         for update
    loop
      v_n := cardinality(v_rule.member_ids);
      for i in 0 .. v_n - 1 loop
        v_cand := v_rule.member_ids[((v_rule.next_index + i) % v_n) + 1];
        if exists (select 1 from public.crm_members m
                    where m.id = v_cand and m.active
                      and (m.role <> 'member'
                           or ((v_lead.status <> 'new' or private.crm_new_count(m.id) < m.new_lead_cap)
                               and private.crm_open_count(m.id) < 1000))) then
          v_pick := v_cand;
          update public.crm_assignment_rules set next_index = (v_rule.next_index + i + 1) % v_n where id = v_rule.id;
          exit;
        end if;
      end loop;
      exit when v_pick is not null;
    end loop;
    if v_pick is not null then
      update public.outreach_leads set assigned_to = v_pick where id = v_lead.id;
      v_key := v_pick::text;
      v_count := v_count || jsonb_build_object(v_key, coalesce((v_count ->> v_key)::integer, 0) + 1);
    end if;
  end loop;
  for v_key in select jsonb_object_keys(v_count) loop
    if v_key::uuid is distinct from v_me then
      insert into public.crm_notifications (member_id, kind, title, actor_id)
      values (v_key::uuid, 'assigned',
              format('%s assigned you %s leads', private.crm_name(v_me, 'Mehdi'), (v_count ->> v_key)::integer), v_me);
    end if;
  end loop;
  return query select e.key::uuid, e.value::integer from jsonb_each_text(v_count) as e;
end $$;

-- Phase 2: the host or an admin closes a booking (done, no-show, cancelled).
create or replace function public.crm_set_booking(p_id bigint, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role text := private.crm_role();
  v_me   uuid := private.crm_member_id();
  b      public.crm_bookings%rowtype;
begin
  select * into b from public.crm_bookings where id = p_id;
  if b.id is null or v_role is null or not (v_role in ('owner', 'admin') or b.host_id = v_me) then
    raise exception 'crm: only the host, an admin or Mehdi closes a booking' using errcode = '42501';
  end if;
  if p_status not in ('done', 'no_show', 'cancelled', 'booked') then
    raise exception 'crm: unknown booking status' using errcode = '22023';
  end if;
  update public.crm_bookings
     set status = p_status, note = coalesce(left(nullif(btrim(p_note), ''), 500), note), updated_at = now()
   where id = p_id;
end $$;


-- ── 21. Functions for the owner only: the Team page ─────────────────────────

-- Add (p_member_id null) or change one person. Arguments left null keep their
-- value. The login itself is made in the Supabase dashboard; the first sign-in
-- links it (crm_me), or this links it at once when it already exists.
-- p_sender_checked true: Mehdi saw their test message arrive from the company
-- number. A new company number clears that tick unless it is given again.
drop function if exists public.crm_save_member(uuid, text, text, text, boolean, boolean, integer, integer, jsonb, text, text, text, boolean);
create or replace function public.crm_save_member(
  p_member_id            uuid    default null,
  p_email                text    default null,
  p_display_name         text    default null,
  p_role                 text    default null,
  p_view_all             boolean default null,
  p_can_add_leads        boolean default null,
  p_wa_daily_limit       integer default null,   -- below 0: no limit (admins only)
  p_new_lead_cap         integer default null,
  p_targets              jsonb   default null,
  p_sender_name          text    default null,
  p_sender_phone         text    default null,
  p_signature            text    default null,
  p_must_change_password boolean default null,
  p_may_cold_call        boolean default null,
  p_sender_checked       boolean default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me    uuid := private.crm_member_id();
  m       public.crm_members%rowtype;
  v_email text := lower(btrim(p_email));
  v_uid   uuid;
  v_phone text := nullif(btrim(p_sender_phone), '');
begin
  if not public.is_admin() then
    raise exception 'crm: only Mehdi manages the team' using errcode = '42501';
  end if;
  if p_role is not null and p_role not in ('admin', 'member') then
    raise exception 'crm: a person is an admin or a member (the owner is set in public.admins)' using errcode = '22023';
  end if;

  if p_member_id is null then
    if v_email is null or p_display_name is null then
      raise exception 'crm: a new person needs an e-mail and a name' using errcode = '22023';
    end if;
    if exists (select 1 from public.admins a where lower(a.email) = v_email) then
      raise exception 'crm: that e-mail is the owner''s' using errcode = '22023';
    end if;
    if exists (select 1 from public.crm_members x where x.email = v_email) then
      raise exception 'crm: % is already in the team. Open them in Team to change them.', v_email using errcode = '23505';
    end if;
    select u.id into v_uid from auth.users u
     where lower(u.email) = v_email and u.email_confirmed_at is not null
       and not exists (select 1 from public.crm_members x where x.user_id = u.id);
    insert into public.crm_members (user_id, email, display_name, role, view_all, can_add_leads,
                                    wa_daily_limit, new_lead_cap, may_cold_call, targets, sender_name, sender_phone,
                                    sender_checked_at, signature, must_change_password, created_by)
    values (v_uid, v_email, p_display_name, coalesce(p_role, 'member'), coalesce(p_view_all, false),
            coalesce(p_can_add_leads, false),
            case when p_wa_daily_limit is null then 25
                 when p_wa_daily_limit < 0 and coalesce(p_role, 'member') = 'admin' then null
                 else greatest(p_wa_daily_limit, 0) end,
            coalesce(p_new_lead_cap, 40), coalesce(p_may_cold_call, false), coalesce(p_targets, '{}'::jsonb),
            nullif(btrim(p_sender_name), ''), v_phone,
            case when coalesce(p_sender_checked, false) and v_phone is not null then now() end,
            nullif(btrim(p_signature), ''), coalesce(p_must_change_password, true), v_me)
    returning * into m;
    return m.id;
  end if;

  select * into m from public.crm_members where id = p_member_id for update;
  if m.id is null then
    raise exception 'crm: no such person in the team' using errcode = 'P0002';
  end if;
  if m.role = 'owner' then
    -- The owner's row: name, sender identity and targets only.
    update public.crm_members
       set display_name = coalesce(nullif(btrim(p_display_name), ''), display_name),
           sender_name  = case when p_sender_name is null then sender_name else nullif(btrim(p_sender_name), '') end,
           sender_phone = case when p_sender_phone is null then sender_phone else v_phone end,
           sender_checked_at = coalesce(sender_checked_at, now()),
           signature    = case when p_signature is null then signature else nullif(btrim(p_signature), '') end,
           targets      = coalesce(p_targets, targets)
     where id = m.id;
    return m.id;
  end if;
  if v_email is not null and v_email <> m.email then
    if m.user_id is not null then
      raise exception 'crm: the e-mail of someone who has signed in cannot change. Add them again with the new one.'
        using errcode = '22023';
    end if;
    if exists (select 1 from public.admins a where lower(a.email) = v_email)
       or exists (select 1 from public.crm_members x where x.email = v_email) then
      raise exception 'crm: % is already taken', v_email using errcode = '23505';
    end if;
  end if;
  update public.crm_members
     set email          = coalesce(v_email, email),
         display_name   = coalesce(nullif(btrim(p_display_name), ''), display_name),
         role           = coalesce(p_role, role),
         view_all       = coalesce(p_view_all, view_all),
         can_add_leads  = coalesce(p_can_add_leads, can_add_leads),
         wa_daily_limit = case when p_wa_daily_limit is null then wa_daily_limit
                               when p_wa_daily_limit < 0 and coalesce(p_role, role) = 'admin' then null
                               else greatest(p_wa_daily_limit, 0) end,
         new_lead_cap   = coalesce(p_new_lead_cap, new_lead_cap),
         may_cold_call  = coalesce(p_may_cold_call, may_cold_call),
         targets        = coalesce(p_targets, targets),
         sender_name    = case when p_sender_name is null then sender_name else nullif(btrim(p_sender_name), '') end,
         sender_phone   = case when p_sender_phone is null then sender_phone else v_phone end,
         sender_checked_at = case
           when p_sender_checked is true and coalesce(case when p_sender_phone is null then sender_phone else v_phone end, '') <> '' then now()
           when p_sender_checked is false then null
           when p_sender_phone is not null and v_phone is distinct from sender_phone then null
           else sender_checked_at end,
         signature      = case when p_signature is null then signature else nullif(btrim(p_signature), '') end,
         must_change_password = coalesce(p_must_change_password, must_change_password)
   where id = m.id;
  return m.id;
end $$;

-- Links every invited row whose login now exists (the Team page's "Check logins").
create or replace function public.crm_link_logins()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  if not public.is_admin() then
    raise exception 'crm: only Mehdi manages the team' using errcode = '42501';
  end if;
  update public.crm_members m
     set user_id = u.id
    from auth.users u
   where m.user_id is null and m.active and lower(u.email) = m.email and u.email_confirmed_at is not null
     and not exists (select 1 from public.crm_members x where x.user_id = u.id);
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Switch someone off. Their OPEN leads move to p_reassign_to (or Unassigned)
-- in the same transaction; closed leads keep their name (credit). Access ends
-- on their very next request.
create or replace function public.crm_deactivate_member(p_member uuid, p_reassign_to uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  m     public.crm_members%rowtype;
  v_ids text[];
  v_n   integer := 0;
begin
  if not public.is_admin() then
    raise exception 'crm: only Mehdi manages the team' using errcode = '42501';
  end if;
  select * into m from public.crm_members where id = p_member for update;
  if m.id is null then
    raise exception 'crm: no such person in the team' using errcode = 'P0002';
  end if;
  if m.role = 'owner' then
    raise exception 'crm: the owner cannot be switched off here (public.admins decides)' using errcode = '42501';
  end if;
  if p_reassign_to = p_member then
    raise exception 'crm: hand their leads to someone else' using errcode = '22023';
  end if;
  select array_agg(l.id) into v_ids from public.outreach_leads l
   where l.assigned_to = p_member and private.crm_is_open(l.data ->> 'status');
  if v_ids is not null then
    if p_reassign_to is not null then
      v_n := public.crm_assign_leads(v_ids, p_reassign_to);
    else
      -- New ones back to the pool; the ones in a conversation to Mehdi.
      update public.outreach_leads
         set assigned_to = case when coalesce(data ->> 'status', 'new') = 'new' then null
                                else private.crm_default_host() end
       where id = any (v_ids);
      get diagnostics v_n = row_count;
    end if;
  end if;
  update public.crm_members set active = false where id = p_member;
  return v_n;
end $$;

create or replace function public.crm_reactivate_member(p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'crm: only Mehdi manages the team' using errcode = '42501';
  end if;
  update public.crm_members set active = true where id = p_member and role <> 'owner';
  if not found then
    raise exception 'crm: no such person in the team' using errcode = 'P0002';
  end if;
end $$;

-- Remove an invitation that was never used (a typo in the e-mail, say).
-- Anyone who has signed in, or holds any lead or history, is switched off
-- instead, so their name stays on what they did.
create or replace function public.crm_delete_invite(p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'crm: only Mehdi manages the team' using errcode = '42501';
  end if;
  delete from public.crm_members m
   where m.id = p_member and m.role <> 'owner' and m.user_id is null and m.joined_at is null
     and not exists (select 1 from public.outreach_leads l
                      where p_member in (l.assigned_to, l.created_by, l.assigned_by, l.qualified_by))
     and not exists (select 1 from public.outreach_events e where e.actor_id = p_member);
  if not found then
    raise exception 'crm: only an unused invitation can be removed; switch the person off instead' using errcode = '22023';
  end if;
end $$;


-- "Reset password" on the Team page, from a phone, with no secret key and no
-- typed e-mail: a new temporary password for THAT person's linked login, never
-- the owner's, returned once (Copy / Send them this) and never stored. They
-- must set their own at the next sign-in. Uses pgcrypto (installed in schema
-- `extensions` on every Supabase project) the way Supabase's own community
-- reset does (discussion #25977); bcrypt cost 10, as Supabase Auth uses.
create extension if not exists pgcrypto with schema extensions;
create or replace function public.crm_reset_password(p_member uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  m       public.crm_members%rowtype;
  v_alpha constant text := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';   -- no 0/O, 1/l/I
  v_pw    text;
  v_n     integer;
begin
  if not public.is_admin() then
    raise exception 'crm: only Mehdi resets passwords' using errcode = '42501';
  end if;
  select * into m from public.crm_members where id = p_member for update;
  if m.id is null then
    raise exception 'crm: no such person in the team' using errcode = 'P0002';
  end if;
  if m.role = 'owner' or m.user_id = auth.uid() then
    raise exception 'crm: the owner''s own password is changed in Supabase, not here' using errcode = '42501';
  end if;
  if m.user_id is null then
    raise exception 'crm: % has no login linked yet. Create it in Supabase (Team shows how), then press "Check logins".', m.display_name
      using errcode = '22023';
  end if;
  select string_agg(substr(v_alpha, (get_byte(x.b, g.i) % length(v_alpha)) + 1, 1), '' order by g.i)
    into v_pw
    from (select extensions.gen_random_bytes(14) as b) x, generate_series(0, 13) as g(i);
  update auth.users
     set encrypted_password = extensions.crypt(v_pw, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = m.user_id;
  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'crm: that login no longer exists' using errcode = 'P0002';
  end if;
  update public.crm_members set must_change_password = true where id = m.id;
  insert into public.crm_audit (actor_id, actor_user, actor_email, action, member_id, detail)
  values (private.crm_member_id(), auth.uid(), auth.jwt() ->> 'email', 'member.password_reset', m.id, '{}'::jsonb);
  return v_pw;
end $$;

-- The owner's Team > Access tab (DPDP Rules 2025, r.6(1)(c): visibility of
-- access "through appropriate logs, monitoring and review"): per person per
-- India-time day, what they opened, changed, exported and imported, how many
-- leads they actually worked, and a flag for a day that looks like copying.
create or replace function public.crm_access_summary(p_from timestamptz, p_to timestamptz default now())
returns table (member_id uuid, display_name text, day date,
               lead_views integer, distinct_leads_viewed integer, leads_worked integer,
               contact_changes integer, exports integer, imports integer, sign_ins integer,
               views_off_hours integer, flagged_claims integer, suspicious boolean)
language sql stable security definer set search_path = '' as $$
  with ok as (select public.is_admin() as yes),
  a as (
    select x.actor_id, (x.at at time zone 'Asia/Kolkata')::date as day, x.action, x.lead_id, x.detail,
           extract(hour from x.at at time zone 'Asia/Kolkata') as hr
      from public.crm_audit x, ok
     where ok.yes and x.at >= p_from and x.at < p_to and x.actor_id is not null
  ),
  w as (   -- leads a person wrote a history line on, per day
    select e.actor_id, (e.created_at at time zone 'Asia/Kolkata')::date as day, count(distinct e.lead_id) as n
      from public.outreach_events e, ok
     where ok.yes and e.created_at >= p_from and e.created_at < p_to and e.actor_id is not null
     group by 1, 2
  ),
  g as (
    select a.actor_id, a.day,
           count(*) filter (where a.action in ('lead.view', 'contact.reveal')) as views,
           count(distinct a.lead_id) filter (where a.action in ('lead.view', 'contact.reveal')) as distinct_views,
           count(*) filter (where a.action = 'lead.update'
                              and a.detail ?| array['phone', 'whatsapp', 'email', 'contactName']) as contact_changes,
           count(*) filter (where a.action = 'export') as exports,
           count(*) filter (where a.action = 'import') as imports,
           count(*) filter (where a.action = 'sign_in') as sign_ins,
           count(*) filter (where a.action in ('lead.view', 'contact.reveal') and (a.hr < 9 or a.hr >= 21)) as off_hours,
           count(*) filter (where a.detail ->> 'flag' = 'not_visible') as flagged,
           -- Lines the person's own app wrote through crm_log_access.
           count(*) filter (where a.action in ('lead.view', 'contact.reveal', 'export', 'import', 'sign_in')) as logged
      from a
     group by a.actor_id, a.day
  )
  select g.actor_id, m.display_name, g.day,
         g.views::integer, g.distinct_views::integer, coalesce(w.n, 0)::integer,
         g.contact_changes::integer, g.exports::integer, g.imports::integer, g.sign_ins::integer,
         g.off_hours::integer, g.flagged::integer,
         -- Copying looks like opening far more leads than one works, at night,
         -- or claiming leads one cannot open. Signing in again and again, or
         -- far more log lines than a day's work makes, is filling the log.
         (g.distinct_views > greatest(3 * coalesce(w.n, 0), 15) or g.off_hours > 0 or g.flagged > 0 or g.exports > 0
          or g.sign_ins > 20 or g.logged > 200)
    from g
    join public.crm_members m on m.id = g.actor_id
    left join w on w.actor_id = g.actor_id and w.day = g.day
   where m.role <> 'owner'
   order by g.day desc, m.display_name
$$;

-- The database's size against the Free plan's 500 MB (read-only past it, for
-- every write in the project: the site's CMS too). Owner only; the Team page
-- warns at 70%.
create or replace function public.crm_db_usage()
returns table (database_bytes bigint, crm_bytes bigint)
language sql stable security definer set search_path = '' as $$
  select pg_database_size(current_database()),
         (select coalesce(sum(pg_total_relation_size(c.oid)), 0)::bigint
            from pg_catalog.pg_class c
            join pg_catalog.pg_namespace n on n.oid = c.relnamespace
           where c.relkind = 'r'
             and ((n.nspname = 'public' and (c.relname like 'crm\_%' or c.relname like 'outreach\_%'))
                  or (n.nspname = 'private' and c.relname like 'crm\_%')))
   where public.is_admin()
$$;


-- ── 21b. The public site's forms: visitors only ─────────────────────────────
-- 0005 let anon AND authenticated insert contact messages, internship
-- applications and demo opens, when "authenticated" could only be Mehdi. Interns
-- now sign in, so the policy is for visitors (anon) only. Mehdi keeps every
-- write through "insert admin" (0005). The site's own requests send the public
-- anon key (src/lib/leads.ts, src/lib/demo/opens.ts), so a visitor is anon
-- whether or not they are signed in somewhere. INSERT stays granted to
-- `authenticated`: Mehdi is `authenticated`, and his CMS saves need it.
drop policy if exists "insert leads anon" on public.content;
create policy "insert leads anon" on public.content
  for insert to anon
  with check (
    collection in ('submissions', 'applications', 'demoSiteOpens')
    and octet_length(data::text) < 20000
  );

create index if not exists content_demo_open_idx on public.content ((data ->> 'demoId'), updated_at)
  where collection = 'demoSiteOpens';

-- A demo open feeds hot leads, so it carries the server's time, counts only
-- for a demo whose link is live, and at most 30 a day per demo. The anon key is
-- public, so anyone can still send an open: it guides who to call first and
-- never judges a person's work. A refused ping is dropped quietly (the
-- visitor's phone never sees an error).
create or replace function private.crm_demo_open_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_claims jsonb;
  v_demo   text := new.data ->> 'demoId';
begin
  if new.collection is distinct from 'demoSiteOpens' then
    return new;
  end if;
  begin
    v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    v_claims := null;
  end;
  -- Visitors (anon) only. Everyone else is for RLS to decide: Mehdi passes,
  -- a signed-in intern is refused with an error, the SQL editor passes.
  if coalesce(v_claims ->> 'role', '') <> 'anon' then
    return new;
  end if;
  if v_demo is null or not exists (select 1 from public.content d
                                    where d.collection = 'demoSites' and d.doc_id = v_demo
                                      and d.data ->> 'status' = 'sent') then
    return null;
  end if;
  if (select count(*) from public.content o
       where o.collection = 'demoSiteOpens' and o.data ->> 'demoId' = v_demo
         and o.updated_at > now() - interval '1 day') >= 30 then
    return null;
  end if;
  new.data := jsonb_build_object('id', new.doc_id, 'demoId', v_demo, 'at', private.crm_iso(now()));
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists crm_demo_open_guard on public.content;
create trigger crm_demo_open_guard
  before insert on public.content
  for each row execute function private.crm_demo_open_guard();


-- ── 22. Who may call what ───────────────────────────────────────────────────
-- Postgres grants EXECUTE to PUBLIC on every new function and Supabase grants
-- it to anon and authenticated by name (0010's note), so take it all back and
-- give exactly this. Trigger functions need no EXECUTE at all to fire.
revoke all on function
  private.crm_iso(timestamptz), private.crm_ts(text), private.crm_blank(jsonb), private.crm_is_open(text),
  private.crm_closed_days(), private.crm_member_free_keys(), private.crm_member_fill_keys(),
  private.crm_member_append_keys(), private.crm_column_keys(), private.crm_daily_limit(text),
  private.crm_role(), private.crm_member_id(), private.crm_view_all(), private.crm_can_add(),
  private.crm_default_host(), private.crm_spend(text, integer), private.crm_member_reads(uuid, text, timestamptz, uuid),
  private.crm_new_count(uuid), private.crm_open_count(uuid), private.crm_check_assignee(uuid, integer, integer, integer),
  private.crm_duplicate_of(text, text, text, text), private.crm_name(uuid, text),
  private.crm_lead_values(text), private.crm_event_values(text), private.crm_date_keys(),
  private.crm_phone_key(text), private.crm_email_key(text), private.crm_log_detail_max(boolean)
  from public, anon;
grant execute on function
  private.crm_iso(timestamptz), private.crm_ts(text), private.crm_blank(jsonb), private.crm_is_open(text),
  private.crm_closed_days(), private.crm_member_free_keys(), private.crm_member_fill_keys(),
  private.crm_member_append_keys(), private.crm_column_keys(), private.crm_daily_limit(text),
  private.crm_role(), private.crm_member_id(), private.crm_view_all(), private.crm_can_add(),
  private.crm_default_host(), private.crm_spend(text, integer), private.crm_member_reads(uuid, text, timestamptz, uuid),
  private.crm_new_count(uuid), private.crm_open_count(uuid), private.crm_check_assignee(uuid, integer, integer, integer),
  private.crm_duplicate_of(text, text, text, text), private.crm_name(uuid, text),
  private.crm_lead_values(text), private.crm_event_values(text), private.crm_date_keys(),
  private.crm_phone_key(text), private.crm_email_key(text), private.crm_log_detail_max(boolean)
  to authenticated, service_role;

revoke all on function
  private.crm_leads_guard(), private.crm_leads_after(), private.crm_events_guard(), private.crm_events_after(),
  private.crm_members_guard(), private.crm_members_after(), private.crm_reviews_guard(), private.crm_rules_guard(),
  private.crm_demo_open_guard()
  from public, anon, authenticated;

revoke all on function
  public.crm_me(), public.crm_password_changed(), public.crm_team(),
  public.crm_find_duplicate(text, text, text), public.crm_lead_demos(), public.crm_demo_opens(timestamptz),
  public.crm_leads_overview(), public.crm_activity_stats(timestamptz, timestamptz),
  public.crm_log_access(text, text, jsonb), public.crm_patch_lead(text, jsonb, text[]),
  public.crm_append_notes(text, text),
  public.crm_publish_lead_demo(text, text), public.crm_busy_slots(uuid, integer),
  public.crm_handoff(text, timestamptz, text, uuid, boolean), public.crm_ask_owner(text, text, text),
  public.crm_resolve_request(bigint, text, text),
  public.crm_assign_leads(text[], uuid), public.crm_distribute(text[], uuid[], text, boolean),
  public.crm_apply_rules(text[], boolean),
  public.crm_set_booking(bigint, text, text),
  public.crm_save_member(uuid, text, text, text, boolean, boolean, integer, integer, jsonb, text, text, text, boolean, boolean, boolean),
  public.crm_link_logins(), public.crm_deactivate_member(uuid, uuid), public.crm_reactivate_member(uuid),
  public.crm_delete_invite(uuid), public.crm_reset_password(uuid),
  public.crm_access_summary(timestamptz, timestamptz), public.crm_db_usage()
  from public, anon, authenticated;
grant execute on function
  public.crm_me(), public.crm_password_changed(), public.crm_team(),
  public.crm_find_duplicate(text, text, text), public.crm_lead_demos(), public.crm_demo_opens(timestamptz),
  public.crm_leads_overview(), public.crm_activity_stats(timestamptz, timestamptz),
  public.crm_log_access(text, text, jsonb), public.crm_patch_lead(text, jsonb, text[]),
  public.crm_append_notes(text, text),
  public.crm_publish_lead_demo(text, text), public.crm_busy_slots(uuid, integer),
  public.crm_handoff(text, timestamptz, text, uuid, boolean), public.crm_ask_owner(text, text, text),
  public.crm_resolve_request(bigint, text, text),
  public.crm_assign_leads(text[], uuid), public.crm_distribute(text[], uuid[], text, boolean),
  public.crm_apply_rules(text[], boolean),
  public.crm_set_booking(bigint, text, text),
  public.crm_save_member(uuid, text, text, text, boolean, boolean, integer, integer, jsonb, text, text, text, boolean, boolean, boolean),
  public.crm_link_logins(), public.crm_deactivate_member(uuid, uuid), public.crm_reactivate_member(uuid),
  public.crm_delete_invite(uuid), public.crm_reset_password(uuid),
  public.crm_access_summary(timestamptz, timestamptz), public.crm_db_usage()
  to authenticated, service_role;


-- ── 23. Today's data: Mehdi's, unchanged ────────────────────────────────────
-- His row (one per e-mail in public.admins), linked to his login when it exists.
insert into public.crm_members (user_id, email, display_name, role, view_all, can_add_leads,
                                wa_daily_limit, new_lead_cap, may_cold_call, sender_checked_at,
                                must_change_password, joined_at)
select u.id, lower(a.email),
       case when lower(a.email) = 'mehdialam2002@gmail.com' then 'Mehdi Alam'
            else initcap(split_part(lower(a.email), '@', 1)) end,
       'owner', true, true, null, 1000, true, now(), false,
       case when u.id is not null then now() end
  from public.admins a
  left join auth.users u on lower(u.email) = lower(a.email)
 where not exists (select 1 from public.crm_members m where m.email = lower(a.email))
   and (u.id is null or not exists (select 1 from public.crm_members m where m.user_id = u.id));

update public.crm_members m
   set user_id = u.id, active = true, joined_at = coalesce(m.joined_at, now())
  from auth.users u
 where m.role = 'owner' and m.user_id is null and lower(u.email) = m.email
   and not exists (select 1 from public.crm_members x where x.user_id = u.id);

-- Every lead so far was added by him. The ones he has already written to, or
-- moved past New, become HIS (assigned to him): a share-out must never hand an
-- intern a school he is talking to, or a proposal. Only leads nobody has
-- written to stay Unassigned: the pool he shares out. His "Mine" view
-- ("assigned to me, or Unassigned") shows exactly today's leads either way.
-- Runs once: a lead that already has its creator is never touched again, so a
-- lead he later puts back in the pool stays there when this file is re-run.
-- Quiet: no "Assigned to Mehdi" line on each lead's history (the audit has it).
select set_config('crm.quiet_assign', 'on', false);
update public.outreach_leads l
   set created_by  = (select private.crm_default_host()),
       assigned_to = case
         when l.assigned_to is null
          and (coalesce(l.data ->> 'status', 'new') <> 'new'
               or exists (select 1 from public.outreach_events e where e.lead_id = l.id))
         then (select private.crm_default_host())
         else l.assigned_to end
 where l.created_by is null and (select private.crm_default_host()) is not null;
select set_config('crm.quiet_assign', '', false);

-- When each closed lead closed: its last change is the best date there is.
update public.outreach_leads l
   set closed_at = coalesce(l.updated_at, now())
 where l.closed_at is null and not private.crm_is_open(l.data ->> 'status');

-- Every history line so far is his. Re-running touches only rows still empty.
update public.outreach_events e
   set actor_id = (select private.crm_default_host())
 where e.actor_id is null and coalesce(e.data ->> 'type', '') not in ('assign', 'handoff')
   and (select private.crm_default_host()) is not null;


-- ── Verification (paste and run; each block is rolled back) ─────────────────
-- 1. A signed-out visitor: every select fails with "permission denied".
--      set role anon;
--      select count(*) from public.outreach_leads;
--      select count(*) from public.crm_members;
--      reset role;
-- 2. Mehdi's own view is unchanged (run as yourself, in the SQL editor):
--      select count(*) as leads,
--             count(*) filter (where assigned_to is null) as pool_never_written_to,
--             count(*) filter (where assigned_to is not null) as already_his,
--             count(*) filter (where created_by is null) as no_creator
--        from public.outreach_leads;          -- pool + his = leads, no_creator = 0
--      select count(*) from public.outreach_leads
--       where assigned_to is null and coalesce(data ->> 'status', 'new') <> 'new';   -- 0
--      select email, role, user_id is not null as linked from public.crm_members;   -- you, owner, linked
-- 3. The full access test: paste supabase/tests/crm_team_rls.sql > Run. It must
--    end with "ALL CRM ACCESS CHECKS PASSED", and it leaves nothing behind.
-- 4. Old history whose lead is gone (run once; 0 means the next line is safe):
--      select count(*) from public.outreach_events e
--       where not exists (select 1 from public.outreach_leads l where l.id = e.lead_id);
--      alter table public.outreach_events validate constraint outreach_events_lead_fk;
-- 5. The database's size against the Free plan's 500 MB (also on Team > Access):
--      select pg_size_pretty(pg_database_size(current_database()));
-- 6. "Reset password" needs pgcrypto in schema extensions (every Supabase
--    project has it there); this must say extensions:
--      select extnamespace::regnamespace from pg_extension where extname = 'pgcrypto';
-- 7. Lead fields that are not text (0 rows expected; the CRM hides such values,
--    and since 0011 only Mehdi's own writes could still make one):
--      select l.id, e.key, jsonb_typeof(e.value) from public.outreach_leads l, jsonb_each(l.data) e
--       where e.key <> 'tags' and jsonb_typeof(e.value) not in ('string', 'null');
--    To remove one such field: update public.outreach_leads set data = data - '<key>' where id = '<id>';

notify pgrst, 'reload schema';
