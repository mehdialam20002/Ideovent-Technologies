-- ════════════════════════════════════════════════════════════════════════════
-- 0013, demos and pitch pages by their link only: checked on the REAL project.
-- Run AFTER 0013, in Supabase > SQL Editor > New query > paste all > Run. It
-- works with or without 0011 (the CRM checks run only where 0011 is).
--
-- Everything happens inside ONE transaction that ends in ROLLBACK: it adds
-- fake demos, pitch pages and other rows (doc ids zz_rows_...), two fake
-- logins (zz-rows-...@example.invalid) and, with 0011, a fake team member and
-- a fake lead. It then acts as a visitor, a plain login, that member and
-- Mehdi exactly as the API does (role + login claims), and stops with
--   ERROR: FAIL: <the rule that did not hold>
-- at the first broken rule. Nothing it writes survives. It reads no real row:
-- it only counts that a visitor gets none. Success ends with one row:
-- ALL ROW ACCESS CHECKS PASSED.
--
-- The same rules, and more, run locally in scripts/test-rows-rls.mjs.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- ── 0013 is there ───────────────────────────────────────────────────────────
do $$
declare q text;
begin
  if to_regprocedure('public.public_row_by_slug(text, text)') is null
     or to_regprocedure('public.public_has_rows(text)') is null then
    raise exception 'FAIL: 0013 has not been run: paste supabase/migrations/0013_rows_by_slug.sql and Run it first';
  end if;
  select p.qual into q from pg_policies p
   where p.schemaname = 'public' and p.tablename = 'content' and p.policyname = 'read public content';
  -- 0013's rule names the two collections and asks no status. 0005's (and an
  -- older file's) asks a demo's or a pitch page's status: that rule is the list.
  if q is null or q not like '%demoSites%' or q not like '%pitchPages%' or q like '%status%' then
    raise exception 'FAIL: "read public content" still lets a visitor list demos or pitch pages (0013 stopped before its step 2, or 0005 or an older file was run again after it). Run 0013 again';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
                  where s.nspname = 'public' and p.proname = 'public_row_by_slug'
                    and p.prosecdef and p.provolatile = 's') then
    raise exception 'FAIL: public_row_by_slug must be STABLE and SECURITY DEFINER';
  end if;
  if has_function_privilege('public', 'public.public_row_by_slug(text, text)', 'execute')
     or has_function_privilege('public', 'public.public_has_rows(text)', 'execute') then
    raise exception 'FAIL: every role (PUBLIC) may run the 0013 functions; only anon and authenticated should';
  end if;
  if not has_function_privilege('anon', 'public.public_row_by_slug(text, text)', 'execute')
     or not has_function_privilege('authenticated', 'public.public_row_by_slug(text, text)', 'execute')
     or not has_function_privilege('anon', 'public.public_has_rows(text)', 'execute') then
    raise exception 'FAIL: a visitor or a login cannot run the 0013 functions: demo links would break';
  end if;
end $$;

-- ── Fake rows and logins (as the SQL editor: trusted) ───────────────────────
insert into public.content (collection, doc_id, data) values
  ('demoSites',   'zz_rows_sent',   '{"id":"zz_rows_sent","slug":"zz-rows-sent-demo","status":"sent","instituteName":"ZZ Rows Sent"}'),
  ('demoSites',   'zz_rows_draft',  '{"id":"zz_rows_draft","slug":"zz-rows-draft-demo","status":"draft","instituteName":"ZZ Rows Draft"}'),
  ('demoSites',   'zz_rows_closed', '{"id":"zz_rows_closed","slug":"zz-rows-closed-demo","status":"closed","instituteName":"ZZ Rows Closed"}'),
  ('pitchPages',  'zz_rows_live',   '{"id":"zz_rows_live","slug":"zz-rows-live-pitch","status":"live","instituteName":"ZZ Rows Live"}'),
  ('pitchPages',  'zz_rows_pdraft', '{"id":"zz_rows_pdraft","slug":"zz-rows-draft-pitch","status":"draft","instituteName":"ZZ Rows Draft Pitch"}'),
  ('faqs',        'zz_rows_faq',    '{"id":"zz_rows_faq","question":"ZZ rows?","answer":"A fake answer."}'),
  ('posts',       'zz_rows_post',   '{"id":"zz_rows_post","slug":"zz-rows-sent-demo","title":"ZZ rows post"}'),
  ('submissions', 'zz_rows_sub',    '{"id":"zz_rows_sub","name":"ZZ rows","slug":"zz-rows-sent-demo"}');

insert into auth.users (id, email, email_confirmed_at, aud, role)
values (gen_random_uuid(), 'zz-rows-plain@example.invalid',  now(), 'authenticated', 'authenticated'),
       (gen_random_uuid(), 'zz-rows-member@example.invalid', now(), 'authenticated', 'authenticated');

-- Mehdi's claims (the e-mail in public.admins) for what follows.
select set_config('request.jwt.claims', json_build_object(
  'sub', (select u.id from auth.users u
           where lower(u.email) = (select lower(a.email) from public.admins a order by a.email limit 1) limit 1),
  'email', (select lower(a.email) from public.admins a order by a.email limit 1),
  'role', 'authenticated')::text, true);

-- With 0011: a fake member, her lead linked to the fake DRAFT demo, and an open of it.
do $$
begin
  if not exists (select 1 from public.admins) then
    raise exception 'FAIL: public.admins is empty: 0005 names the admin (Mehdi''s login e-mail)';
  end if;
  if to_regprocedure('public.crm_lead_demos()') is not null then
    perform public.crm_save_member(p_email => 'zz-rows-member@example.invalid', p_display_name => 'ZZ Rows Member', p_role => 'member');
    insert into public.outreach_leads (id, data, assigned_to) values
      ('zz_rows_L1', '{"id":"zz_rows_L1","instituteName":"ZZ Rows One","kind":"school","status":"contacted","demoId":"zz_rows_draft"}',
       (select m.id from public.crm_members m where m.email = 'zz-rows-member@example.invalid'));
    insert into public.content (collection, doc_id, data) values
      ('demoSiteOpens', 'zz_rows_open_draft', '{"id":"zz_rows_open_draft","demoId":"zz_rows_draft","at":"2026-10-02T10:00:00.000Z"}');
  end if;
end $$;

-- ── A visitor, a plain login and (with 0011) the member: no list, one row by link ──
do $$
declare
  who text;
  n   int;
  d   text;
  b   boolean;
begin
  foreach who in array array['anon', 'plain', 'member'] loop
    if who = 'member' and to_regprocedure('public.crm_lead_demos()') is null then
      continue;
    end if;
    perform set_config('request.jwt.claims', case when who = 'anon' then '{"role":"anon"}' else json_build_object(
      'sub', (select u.id from auth.users u where u.email = 'zz-rows-' || who || '@example.invalid'),
      'email', 'zz-rows-' || who || '@example.invalid', 'role', 'authenticated')::text end, true);
    if who = 'anon' then set local role anon; else set local role authenticated; end if;

    -- No list, filtered or not.
    select count(*) into n from public.content where collection in ('demoSites', 'pitchPages');
    if n <> 0 then raise exception 'FAIL: % listed % demo or pitch-page rows (the whole pipeline)', who, n; end if;
    select count(*) into n from public.content where collection = 'demoSites' and data ->> 'slug' = 'zz-rows-sent-demo';
    if n <> 0 then raise exception 'FAIL: % read a sent demo straight from the table', who; end if;
    select count(*) into n from public.content where collection = 'pitchPages' and data ->> 'slug' ilike 'zz-rows-live-pitch';
    if n <> 0 then raise exception 'FAIL: % read a live pitch page straight from the table', who; end if;
    select count(*) into n from public.content where doc_id like 'zz_rows_%' and collection in ('demoSites', 'pitchPages');
    if n <> 0 then raise exception 'FAIL: % found a fake demo or pitch page in the table', who; end if;

    -- One row, by its link: any case, spaces around.
    select r.doc_id into d from public.public_row_by_slug('demoSites', '  ZZ-Rows-SENT-demo ') r;
    if d is distinct from 'zz_rows_sent' then raise exception 'FAIL: % could not open the sent demo by its link (got %)', who, d; end if;
    select count(*) into n from public.public_row_by_slug('demoSites', 'zz-rows-sent-demo');
    if n <> 1 then raise exception 'FAIL: % got % rows for one link (one, always)', who, n; end if;
    select r.doc_id into d from public.public_row_by_slug('pitchPages', 'ZZ-ROWS-LIVE-PITCH  ') r;
    if d is distinct from 'zz_rows_live' then raise exception 'FAIL: % could not open the live pitch page by its link (got %)', who, d; end if;

    -- Nothing that is not a sent demo or a live pitch page.
    select count(*) into n from public.public_row_by_slug('demoSites', 'zz-rows-draft-demo');
    if n <> 0 then raise exception 'FAIL: % opened a DRAFT demo by its slug', who; end if;
    select count(*) into n from public.public_row_by_slug('demoSites', 'zz-rows-closed-demo');
    if n <> 0 then raise exception 'FAIL: % opened a CLOSED demo by its slug', who; end if;
    select count(*) into n from public.public_row_by_slug('pitchPages', 'zz-rows-draft-pitch');
    if n <> 0 then raise exception 'FAIL: % opened a DRAFT pitch page by its slug', who; end if;
    select count(*) into n from public.public_row_by_slug('pitchPages', 'zz-rows-sent-demo');
    if n <> 0 then raise exception 'FAIL: % opened a demo through the pitch-page link', who; end if;
    select count(*) into n from public.public_row_by_slug('demoSites', 'zz-rows-no-such-demo');
    if n <> 0 then raise exception 'FAIL: % got a row for an unknown slug', who; end if;
    select count(*) into n from public.public_row_by_slug('demoSites', '');
    if n <> 0 then raise exception 'FAIL: % got a row for an empty slug', who; end if;
    select count(*) into n from public.public_row_by_slug('demoSites', null);
    if n <> 0 then raise exception 'FAIL: % got a row for no slug', who; end if;
    select count(*) into n from public.public_row_by_slug('demoSites', repeat('z', 500));
    if n <> 0 then raise exception 'FAIL: % got a row for a 500-character slug', who; end if;
    select count(*) into n from public.public_row_by_slug('demoSites', '%');
    if n <> 0 then raise exception 'FAIL: % got a row for a LIKE wildcard', who; end if;
    select count(*) into n from public.public_row_by_slug('submissions', 'zz-rows-sent-demo');
    if n <> 0 then raise exception 'FAIL: % read a contact message through the link function', who; end if;
    select count(*) into n from public.public_row_by_slug('posts', 'zz-rows-sent-demo');
    if n <> 0 then raise exception 'FAIL: % read another collection through the link function', who; end if;
    select count(*) into n from public.public_row_by_slug('demoSiteOpens', 'zz-rows-sent-demo');
    if n <> 0 then raise exception 'FAIL: % read demo opens through the link function', who; end if;
    select count(*) into n from public.public_row_by_slug('certificateGrades', 'zz-rows-sent-demo');
    if n <> 0 then raise exception 'FAIL: % read certificate grades through the link function', who; end if;

    -- Is there any? true or false, never a row.
    if public.public_has_rows('demoSites') is not true then raise exception 'FAIL: % was told there is no sent demo', who; end if;
    if public.public_has_rows('pitchPages') is not true then raise exception 'FAIL: % was told there is no live pitch page', who; end if;
    b := public.public_has_rows('submissions');
    if b is distinct from false then raise exception 'FAIL: public_has_rows answered % for submissions (false expected)', b; end if;
    b := public.public_has_rows(null);
    if b is distinct from false then raise exception 'FAIL: public_has_rows answered % for no collection (false expected)', b; end if;

    -- Every other public collection reads as before; private ones stay private.
    select count(*) into n from public.content where doc_id in ('zz_rows_faq', 'zz_rows_post');
    if n <> 2 then raise exception 'FAIL: % can no longer read the public FAQ and post rows (% of 2)', who, n; end if;
    select count(*) into n from public.content where doc_id = 'zz_rows_sub';
    if n <> 0 then raise exception 'FAIL: % read a contact message', who; end if;

    reset role;
  end loop;
end $$;

-- ── With 0011: the member's demos and Hot list still come from 0011's functions ──
select set_config('request.jwt.claims', json_build_object(
  'sub', (select u.id from auth.users u where u.email = 'zz-rows-member@example.invalid'),
  'email', 'zz-rows-member@example.invalid', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  if to_regprocedure('public.crm_lead_demos()') is null then
    return;
  end if;
  select count(*) into n from public.crm_lead_demos() d where d.demo_id = 'zz_rows_draft' and d.data ->> 'status' = 'draft';
  if n <> 1 then raise exception 'FAIL: crm_lead_demos() no longer gives the member the (draft) demo of her lead'; end if;
  select count(*) into n from public.crm_demo_opens() o where o.open_id = 'zz_rows_open_draft' and o.demo_id = 'zz_rows_draft';
  if n <> 1 then raise exception 'FAIL: crm_demo_opens() no longer gives the member the opens of her lead''s demo'; end if;
end $$;
reset role;

-- ── A visitor's demo open still goes in for a sent demo (the guard reads as its owner) ──
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
insert into public.content (collection, doc_id, data) values
  ('demoSiteOpens', 'zz_rows_open_sent',    '{"id":"zz_rows_open_sent","demoId":"zz_rows_sent"}'),
  ('demoSiteOpens', 'zz_rows_open_refused', '{"id":"zz_rows_open_refused","demoId":"zz_rows_draft"}');
reset role;
do $$
begin
  if not exists (select 1 from public.content where collection = 'demoSiteOpens' and doc_id = 'zz_rows_open_sent') then
    raise exception 'FAIL: a visitor''s open of a SENT demo was not recorded';
  end if;
  -- 0011's guard keeps an open only for a demo whose link is live.
  if exists (select 1 from pg_trigger where tgname = 'crm_demo_open_guard' and not tgisinternal)
     and exists (select 1 from public.content where collection = 'demoSiteOpens' and doc_id = 'zz_rows_open_refused') then
    raise exception 'FAIL: a visitor''s open of a DRAFT demo was recorded (the guard should drop it)';
  end if;
end $$;

-- ── Mehdi still reads every row, drafts and private ones included ───────────
select set_config('request.jwt.claims', json_build_object(
  'sub', (select u.id from auth.users u
           where lower(u.email) = (select lower(a.email) from public.admins a order by a.email limit 1) limit 1),
  'email', (select lower(a.email) from public.admins a order by a.email limit 1),
  'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int; d text;
begin
  if not public.is_admin() then raise exception 'FAIL: the claims of the e-mail in public.admins do not make is_admin() true'; end if;
  select count(*) into n from public.content where doc_id in
    ('zz_rows_sent', 'zz_rows_draft', 'zz_rows_closed', 'zz_rows_live', 'zz_rows_pdraft', 'zz_rows_faq', 'zz_rows_post', 'zz_rows_sub');
  if n <> 8 then raise exception 'FAIL: Mehdi reads % of the 8 fake rows (all 8, drafts and the contact message included)', n; end if;
  select r.doc_id into d from public.public_row_by_slug('demoSites', 'zz-rows-sent-demo') r;
  if d is distinct from 'zz_rows_sent' then raise exception 'FAIL: the link function does not answer Mehdi either (got %)', d; end if;
end $$;

reset role;
select 'ALL ROW ACCESS CHECKS PASSED' as result;
rollback;
