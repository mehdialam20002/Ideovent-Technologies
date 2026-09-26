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
