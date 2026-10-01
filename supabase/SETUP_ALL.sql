-- ════════════════════════════════════════════════════════════════════════
-- IDEOVENT: THE WHOLE DATABASE IN ONE PASTE
-- Supabase > SQL Editor > New query > paste all of this > Run.
-- It is migrations 0001 to 0010 in order. Every statement is safe to run
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
