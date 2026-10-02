-- ════════════════════════════════════════════════════════════════════════════
-- Meta Lead Ads: the intake's rules, checked on the REAL Supabase project.
-- Run AFTER 0011 and 0012, in Supabase > SQL Editor > New query > paste all > Run.
--
-- Everything happens inside ONE transaction that ends in ROLLBACK: it adds a
-- fake login (zz-meta-...@example.invalid), connects the intake to a TEST
-- fingerprint for the length of the transaction, sends three fictional leads
-- through it (one carrying another's number, one with the WhatsApp-and-phone
-- box unticked), and acts as a visitor, a member and the owner exactly as the API
-- does. It stops with
--   ERROR: FAIL: <the rule that did not hold>
-- at the first broken rule. Nothing it writes survives: your real Connect,
-- leads and log are as they were. Success ends with one row:
-- ALL META INTAKE CHECKS PASSED.
--
-- The same rules, and many more, run locally in scripts/test-meta-rls.mjs.
-- ════════════════════════════════════════════════════════════════════════════
begin;

create temporary table zz_meta (k text primary key, v text) on commit drop;
insert into auth.users (id, email, email_confirmed_at, aud, role)
values (gen_random_uuid(), 'zz-meta-asha@example.invalid', now(), 'authenticated', 'authenticated');
insert into zz_meta select 'asha_uid', id::text from auth.users where email = 'zz-meta-asha@example.invalid';
insert into zz_meta select 'owner_uid', u.id::text from auth.users u
 where lower(u.email) = (select lower(a.email) from public.admins a order by a.email limit 1);
insert into zz_meta values ('owner_email', (select lower(a.email) from public.admins a order by a.email limit 1));
grant select on zz_meta to anon, authenticated;

do $$ begin
  if (select count(*) from zz_meta where k = 'owner_uid') <> 1 then
    raise exception 'FAIL: no login matches the e-mail in public.admins: create Mehdi''s login first';
  end if;
end $$;

-- ── The owner: a fake member, and Connect with a TEST fingerprint ───────────
select set_config('request.jwt.claims', json_build_object('sub', (select v from zz_meta where k = 'owner_uid'),
  'email', (select v from zz_meta where k = 'owner_email'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  perform public.crm_save_member(p_email => 'zz-meta-asha@example.invalid', p_display_name => 'ZZ Meta Asha', p_role => 'member');
  perform public.meta_connect(encode(sha256(convert_to('zz-meta-rls-test-token', 'UTF8')), 'hex'), null, '9000000000000001',
                              'ZZ test Page', '{}'::jsonb);
  if not (public.meta_intake_status(encode(sha256(convert_to('zz-meta-rls-test-token', 'UTF8')), 'hex'), null) ->> 'current')::boolean then
    raise exception 'FAIL: the status does not see the fingerprint just connected';
  end if;
end $$;
reset role;

-- ── A visitor (anon): the tables are closed, a forged token writes nothing ──
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$ begin
  begin perform count(*) from public.meta_leads;      raise exception 'FAIL: a visitor read meta_leads';      exception when insufficient_privilege then null; end;
  begin perform count(*) from public.meta_ingest_log; raise exception 'FAIL: a visitor read meta_ingest_log'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.meta_settings;   raise exception 'FAIL: a visitor read meta_settings';   exception when insufficient_privilege then null; end;
  begin
    perform public.meta_lead_ingest('forged', '9000000000009901', '{"instituteName":"ZZ forged"}'::jsonb, 'webhook', '9000000000000001');
    raise exception 'FAIL: a forged token was accepted';
  exception when sqlstate '28000' then null; end;
  begin
    perform public.meta_connect(repeat('0', 64), null, '1', 'x', '{}'::jsonb);
    raise exception 'FAIL: a visitor could call meta_connect';
  exception when insufficient_privilege then null; end;
end $$;

-- ── The server's own path, with the test token: one lead, once ──────────────
do $$
declare r jsonb;
begin
  r := public.meta_lead_receive('zz-meta-rls-test-token',
         '[{"leadgen_id":"9000000000009902","page_id":"9000000000000001","form_id":null,"ad_id":null,"created_time":null}]'::jsonb,
         'webhook', '9000000000000001');
  if r -> 'fetch' <> '["9000000000009902"]'::jsonb then raise exception 'FAIL: receive did not store the new id: %', r; end if;
  r := public.meta_lead_ingest('zz-meta-rls-test-token', '9000000000009902',
         '{"instituteName":"ZZ Meta Test Classes","phone":"+910000009902","source":"Facebook Lead Ads","kind":"coaching","notes":"ZZ test"}'::jsonb,
         'webhook', '9000000000000001');
  if r ->> 'result' <> 'created' then raise exception 'FAIL: the test lead was not created: %', r; end if;
  r := public.meta_lead_ingest('zz-meta-rls-test-token', '9000000000009902', '{"instituteName":"ZZ again"}'::jsonb, 'webhook', '9000000000000001');
  if r ->> 'result' <> 'already' then raise exception 'FAIL: the same Meta lead id came in twice: %', r; end if;
end $$;

-- ── Another form with the test lead's number, and a lead who left the box unticked ──
-- Anyone can type someone else's number into a form: the lead gets a plain line,
-- the answers go to Mehdi alone. A lead who did not tick "WhatsApp and phone" is
-- e-mailed only (checked below, as the member).
do $$
declare r jsonb;
begin
  r := public.meta_lead_receive('zz-meta-rls-test-token',
         '[{"leadgen_id":"9000000000009903","page_id":"9000000000000001","form_id":null,"ad_id":null,"created_time":null},
           {"leadgen_id":"9000000000009904","page_id":"9000000000000001","form_id":null,"ad_id":null,"created_time":null}]'::jsonb,
         'webhook', '9000000000000001');
  r := public.meta_lead_ingest('zz-meta-rls-test-token', '9000000000009903',
         jsonb_build_object('instituteName', 'ZZ Someone Else', 'phone', '+91 00000 09902',
                            'notes', E'ZZ test\nAnswers:\nfull_name: ZZ Stranger\nmessage: zz call another number'),
         'webhook', '9000000000000001');
  if r ->> 'result' <> 'duplicate' or r ->> 'leadId' <> 'ol_meta_9000000000009902' then
    raise exception 'FAIL: a form with the test lead''s number was not a duplicate of it: %', r;
  end if;
  r := public.meta_lead_ingest('zz-meta-rls-test-token', '9000000000009904',
         '{"instituteName":"ZZ Meta Unticked","phone":"+910000009904","source":"Instagram Lead Ads","kind":"coaching","metaConsent":"no"}'::jsonb,
         'webhook', '9000000000000001');
  if r ->> 'result' <> 'created' then raise exception 'FAIL: the unticked test lead was not created: %', r; end if;
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.outreach_events e where e.lead_id = 'ol_meta_9000000000009902' and e.data::text like '%ZZ Stranger%') then
    raise exception 'FAIL: the second form''s answers were written on the lead''s history';
  end if;
  if not exists (select 1 from public.outreach_events e where e.id = 'oe_meta_9000000000009903'
                   and e.data ->> 'detail' like 'Someone sent the % lead form with this lead''s phone number%') then
    raise exception 'FAIL: the lead did not get the plain "Someone sent the ... lead form" line';
  end if;
  if not exists (select 1 from public.crm_requests q where q.lead_id = 'ol_meta_9000000000009902' and q.kind = 'meta_form'
                   and q.asked_by is null and q.body like '%ZZ Stranger%') then
    raise exception 'FAIL: the second form''s answers did not go to Mehdi as a request';
  end if;
end $$;
select set_config('request.jwt.claims', json_build_object('sub', (select v from zz_meta where k = 'owner_uid'),
  'email', (select v from zz_meta where k = 'owner_email'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  perform public.crm_assign_leads(array['ol_meta_9000000000009904'],
                                  (select m.id from public.crm_members m where m.email = 'zz-meta-asha@example.invalid'));
end $$;
reset role;
do $$ begin
  if (select count(*) from public.outreach_leads where id = 'ol_meta_9000000000009902'
        and created_by = (select m.id from public.crm_members m where m.role = 'owner' and m.active order by m.created_at limit 1)
        and assigned_to is null and data ->> 'status' = 'new') <> 1 then
    raise exception 'FAIL: the test lead is not one New, Unassigned lead added by Mehdi';
  end if;
end $$;

-- ── A member: no row of the intake's tables, no Connect, no token function ──
select set_config('request.jwt.claims', json_build_object('sub', (select v from zz_meta where k = 'asha_uid'),
  'email', 'zz-meta-asha@example.invalid', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  perform public.crm_me();   -- her first sign-in links the invitation: she is a member from here on
  if private.crm_member_id() is null then raise exception 'FAIL: the fake member was not linked'; end if;
  select count(*) into n from public.meta_leads;
  if n <> 0 then raise exception 'FAIL: a member read % rows of meta_leads', n; end if;
  select count(*) into n from public.meta_ingest_log;
  if n <> 0 then raise exception 'FAIL: a member read % rows of meta_ingest_log', n; end if;
  select count(*) into n from public.outreach_leads where id = 'ol_meta_9000000000009902';
  if n <> 0 then raise exception 'FAIL: a member read a Meta lead not assigned to her'; end if;
  select count(*) into n from public.crm_requests where kind = 'meta_form';
  if n <> 0 then raise exception 'FAIL: a member read % Meta form requests (the answers are Mehdi''s alone)', n; end if;
  -- The unticked lead, now hers: a WhatsApp line is refused, an e-mail is fine.
  begin
    insert into public.outreach_events (id, lead_id, data)
    values ('zz_meta_E1', 'ol_meta_9000000000009904', '{"type":"sent","channel":"whatsapp","stage":"first"}');
    raise exception 'FAIL: a WhatsApp line to a lead who did not tick the box was accepted';
  exception when insufficient_privilege then
    if sqlerrm not like '%did not tick the box%' then
      raise exception 'FAIL: the WhatsApp line was refused for another reason: %', sqlerrm;
    end if;
  end;
  insert into public.outreach_events (id, lead_id, data)
  values ('zz_meta_E2', 'ol_meta_9000000000009904', '{"type":"sent","channel":"email","stage":"first"}');
  begin perform count(*) from public.meta_settings; raise exception 'FAIL: a member read meta_settings'; exception when insufficient_privilege then null; end;
  begin
    perform public.meta_connect(repeat('0', 64), null, '1', 'x', '{}'::jsonb);
    raise exception 'FAIL: a member could connect the intake';
  exception when insufficient_privilege then null; end;
  begin
    perform public.meta_lead_receive('zz-meta-rls-test-token', '[]'::jsonb, 'webhook', '9000000000000001');
    raise exception 'FAIL: a member could call a token function';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'ALL META INTAKE CHECKS PASSED' as result;
rollback;
