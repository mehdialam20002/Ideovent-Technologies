-- ════════════════════════════════════════════════════════════════════════
-- IDEOVENT: THE WHOLE DATABASE IN ONE PASTE
-- Supabase > SQL Editor > New query > paste all of this > Run.
-- It is migrations 0001 to 0007 in order. Every statement is safe to run
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
