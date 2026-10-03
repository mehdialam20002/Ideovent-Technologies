-- ════════════════════════════════════════════════════════════════════════════
-- 0013: a demo and a pitch page are read one at a time, by their link, never
-- as a list.
-- Written 2 October 2026. Needs 0005 (the read policy it replaces). Does not
-- need 0011 or 0012 and works with or without them. Safe to run more than
-- once, and safe to run ON ITS OWN on the live project: paste only this file
-- into Supabase > SQL Editor > New query > Run. It takes about five seconds
-- (TWO STEPS, below).
-- ════════════════════════════════════════════════════════════════════════════
--
-- THE HOLE THIS CLOSES
-- 0005 let anyone read a demo whose status is `sent` and a pitch page whose
-- status is `live`, which is what the site's own pages serve. But the anon
-- key is public (it ships in the site's JavaScript), and that policy answers
-- a LIST as readily as one row, so one request
--
--   GET <project>/rest/v1/content?collection=eq.demoSites&apikey=<anon key>
--
-- downloaded every prospect Mehdi has pitched: business names, cities, phone
-- numbers, e-mails, addresses, principals' names and every demo link. A
-- visitor needs exactly one row: the one in the link they were sent.
--
-- WHAT CHANGES
--   * "read public content" is 0005's policy with demoSites and pitchPages
--     taken out of it entirely. Every other public collection reads exactly as
--     before, and "read all admin" (0005) still gives Mehdi every row.
--   * public.public_row_by_slug(collection, slug) answers ONE row: the sent
--     demo or the live pitch page whose slug is the one asked for (case and
--     outer spaces ignored, as the site compares them). Nothing for any other
--     collection, nor for an empty slug or one longer than 120 characters.
--   * public.public_has_rows(collection) answers true or false: is there any
--     sent demo (live pitch page) at all? The site needs it for one rule: the
--     seed's two example pitch pages show only while no real one exists.
--
-- WHAT DOES NOT CHANGE
--   * Visitors. A demo link and a pitch page open as before. The site asks
--     the function first and, while this file has not been run, falls back to
--     the old read (src/lib/cms/publicRead.ts), so the code goes live first.
--   * Mehdi's admin and CRM read every row with his login ("read all admin").
--   * 0011's crm_lead_demos(), crm_demo_opens() and the demo-open guard read
--     as their owner (SECURITY DEFINER), not through this policy: a member's
--     demos, a member's Hot list and a visitor's demo open work as before.
--   * A CRM member (0011), like any other login, reads no demo and no pitch
--     page from the table, exactly as a visitor; the demos of their own leads
--     come from crm_lead_demos().
--
-- WHAT IT DOES NOT CLOSE (accepted, 2 October 2026)
-- A demo's slug is the business's own name, so somebody holding a list of
-- clinic names can still try them one at a time. Each hit shows only what
-- that business already publishes about itself, one demo per guess; the bulk
-- download of the whole pipeline is what this file closes. Existing slugs
-- stay as they are: changing them would break links already sent.
--
-- RUN IT ONLY ONCE THE SITE THAT ASKS THE FUNCTION IS LIVE, AND NEVER GO BACK
-- TO A SITE FROM BEFORE IT (3 October 2026). A build of the site from before
-- src/lib/cms/publicRead.ts asked public_row_by_slug reads a demo from the
-- list this file closes, so on it every demo and pitch link shows "Page not
-- found". First the Vercel production deployment of that code shows Ready,
-- then this file. After it, no Instant Rollback to (and no promoting of) a
-- deployment built before that code. The undo on this side is 0005's "read
-- public content" block, run again: it opens the list again, the hole too.
--
-- TWO STEPS, FIVE SECONDS APART (3 October 2026). PostgREST serves a new
-- function only once it has reloaded its schema, a moment after the commit.
-- Were the functions and the closed list one transaction, a page opened in
-- that moment would get a 404 from the function AND nothing from the table,
-- and show "Page not found" until reloaded. So step 1 commits the functions
-- and tells PostgREST; step 2 closes the list five seconds later; a page
-- opened in between still reads its row the old way. If step 2 ever fails,
-- step 1 stays, which changes nothing a visitor sees: run the file again.
--
-- ORDER. 0001 to 0005 each rewrite "read public content". Running one of
-- them again ON ITS OWN puts the list read back; run this file again after
-- it. SETUP_ALL.sql carries this file after them, so the one paste is right.
-- ════════════════════════════════════════════════════════════════════════════

-- ══ Step 1: the two functions, committed before anything else changes ══════
begin;

-- ── One demo or pitch page, by the slug in its link ─────────────────────────
-- STABLE, so PostgREST also serves it to a GET (no CORS preflight for the
-- visitor's phone). SECURITY DEFINER, so it reads as its owner past the policy
-- of step 2; everything it may return is decided here, in four conditions. The
-- newest row wins if two ever share a slug, and there is never a second one.
create or replace function public.public_row_by_slug(p_collection text, p_slug text)
returns table (collection text, doc_id text, data jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select c.collection, c.doc_id, c.data
    from public.content c
   where p_collection in ('demoSites', 'pitchPages')
     and c.collection = p_collection
     and char_length(btrim(p_slug)) between 1 and 120
     and lower(btrim(c.data ->> 'slug')) = lower(btrim(p_slug))
     and ((c.collection = 'demoSites'  and c.data ->> 'status' = 'sent')
       or (c.collection = 'pitchPages' and c.data ->> 'status' = 'live'))
   order by c.updated_at desc, c.doc_id
   limit 1
$$;

-- ── Is there any? (true or false, never a row) ──────────────────────────────
create or replace function public.public_has_rows(p_collection text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.content c
     where p_collection in ('demoSites', 'pitchPages')
       and c.collection = p_collection
       and ((c.collection = 'demoSites'  and c.data ->> 'status' = 'sent')
         or (c.collection = 'pitchPages' and c.data ->> 'status' = 'live'))
  )
$$;

-- Postgres grants EXECUTE to PUBLIC on every new function: take that back and
-- give it by name to the two roles a request arrives as.
revoke all on function public.public_row_by_slug(text, text) from public;
revoke all on function public.public_has_rows(text) from public;
grant execute on function public.public_row_by_slug(text, text) to anon, authenticated;
grant execute on function public.public_has_rows(text) to anon, authenticated;

-- PostgREST picks up the two functions without a restart. A NOTIFY reaches it
-- when its transaction commits: this one, on the next line.
notify pgrst, 'reload schema';
commit;

-- ══ The five seconds: PostgREST loads the functions ═════════════════════════
-- Only on Supabase, whose API logs in as `authenticator`. The reload takes
-- well under a second; five leave room. A test database has no API to wait
-- for (scripts/test-rows-rls.mjs times both cases).
select pg_sleep(5)
 where exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticator');

-- ══ Step 2: the table stops listing demos and pitch pages ══════════════════
begin;

-- ── Content: public reads, without demos and pitch pages ────────────────────
-- 0005's list, plus the two collections that are now read one row at a time.
-- The first six are PRIVATE_COLLECTIONS in src/lib/cms/types.ts: keep them
-- identical.
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
      'demoSiteOpens',
      'demoSites',
      'pitchPages'
    )
  );

commit;

-- Verification (as yourself, in the SQL editor; each block changes nothing).
-- 1. A visitor lists no demo and no pitch page: both counts must be 0.
--      begin;
--      set local role anon;
--      select count(*) from public.content where collection = 'demoSites';
--      select count(*) from public.content where collection = 'pitchPages';
--      rollback;
-- 2. ...and still opens one by its link (one row, for a slug you have sent):
--      begin;
--      set local role anon;
--      select doc_id, data ->> 'status' from public.public_row_by_slug('demoSites', '<a sent demo''s slug>');
--      rollback;
-- 3. The full test: paste supabase/tests/rows_by_slug_rls.sql > Run. It must
--    end with "ALL ROW ACCESS CHECKS PASSED", and it leaves nothing behind.
