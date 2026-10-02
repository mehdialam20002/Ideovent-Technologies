-- ════════════════════════════════════════════════════════════════════════════
-- CRM team: the access rules, checked on the REAL Supabase project.
-- Run AFTER 0011, in Supabase > SQL Editor > New query > paste all > Run.
--
-- Everything happens inside ONE transaction that ends in ROLLBACK: it adds
-- four fake logins (zz-rls-...@example.invalid), a fake team and seven fake
-- leads (zz_rls_...), acts as each person exactly as the API does (role
-- authenticated + their login token's claims), and stops with
--   ERROR: FAIL: <the rule that did not hold>
-- at the first broken rule. Nothing it writes survives, and no real lead is
-- read or changed. Success ends with one row: ALL CRM ACCESS CHECKS PASSED.
--
-- The same rules, and many more, run locally in scripts/test-crm-rls.mjs.
-- This file exists to prove them on Supabase itself before an intern signs in.
-- ════════════════════════════════════════════════════════════════════════════
begin;

create temporary table zz_ids (k text primary key, v uuid) on commit drop;

-- ── Fake logins ─────────────────────────────────────────────────────────────
insert into auth.users (id, email, email_confirmed_at, aud, role)
values (gen_random_uuid(), 'zz-rls-asha@example.invalid',  now(), 'authenticated', 'authenticated'),
       (gen_random_uuid(), 'zz-rls-bilal@example.invalid', now(), 'authenticated', 'authenticated'),
       (gen_random_uuid(), 'zz-rls-ayesha@example.invalid', now(), 'authenticated', 'authenticated'),
       (gen_random_uuid(), 'zz-rls-dev@example.invalid',   now(), 'authenticated', 'authenticated');
insert into zz_ids
select split_part(split_part(email, '@', 1), '-', 3), id from auth.users where email like 'zz-rls-%@example.invalid';
insert into zz_ids
select 'owner_uid', u.id from auth.users u
 where lower(u.email) = (select lower(a.email) from public.admins a order by a.email limit 1);

do $$ begin
  if (select count(*) from zz_ids where k = 'owner_uid') <> 1 then
    raise exception 'FAIL: no login matches the e-mail in public.admins: create Mehdi''s login first';
  end if;
end $$;

-- ── Act as the owner: build the team ────────────────────────────────────────
select set_config('request.jwt.claims', json_build_object(
  'sub', (select v from zz_ids where k = 'owner_uid'),
  'email', (select lower(a.email) from public.admins a order by a.email limit 1),
  'role', 'authenticated')::text, true);
set local role authenticated;

do $$ begin
  if not public.is_admin() then raise exception 'FAIL: the owner claims do not make is_admin() true'; end if;
  perform public.crm_save_member(p_email => 'zz-rls-asha@example.invalid',  p_display_name => 'ZZ Asha',  p_role => 'member', p_new_lead_cap => 2);
  perform public.crm_save_member(p_email => 'zz-rls-bilal@example.invalid', p_display_name => 'ZZ Bilal', p_role => 'member', p_view_all => true);
  perform public.crm_save_member(p_email => 'zz-rls-ayesha@example.invalid', p_display_name => 'ZZ Ayesha', p_role => 'admin');
end $$;

reset role;
insert into zz_ids select 'm_' || split_part(split_part(email, '@', 1), '-', 3), id
  from public.crm_members where email like 'zz-rls-%@example.invalid';

-- Seven fake leads (as the SQL editor: trusted), two assigned to asha, one to bilal.
insert into public.outreach_leads (id, data, assigned_to) values
  ('zz_rls_L1', '{"id":"zz_rls_L1","instituteName":"ZZ Asha One","kind":"school","status":"contacted","phone":"+910000000001"}', (select v from zz_ids where k = 'm_asha')),
  ('zz_rls_L2', '{"id":"zz_rls_L2","instituteName":"ZZ Asha DNC","kind":"school","status":"do_not_contact","phone":"+910000000002"}', (select v from zz_ids where k = 'm_asha')),
  ('zz_rls_L3', '{"id":"zz_rls_L3","instituteName":"ZZ Bilal Three","kind":"coaching","status":"new","phone":"+910000000003"}', (select v from zz_ids where k = 'm_bilal')),
  ('zz_rls_L4', '{"id":"zz_rls_L4","instituteName":"ZZ Pool Four","kind":"school","status":"new","phone":"+910000000004"}', null),
  ('zz_rls_L5', '{"id":"zz_rls_L5","instituteName":"ZZ Pool Five","kind":"school","status":"new","phone":"+910000000005"}', null),
  ('zz_rls_L6', '{"id":"zz_rls_L6","instituteName":"ZZ Pool Six","kind":"school","status":"new","phone":"+910000000006"}', null),
  ('zz_rls_L7', '{"id":"zz_rls_L7","instituteName":"ZZ Pool Seven","kind":"school","status":"new","phone":"+910000000007"}', null);
insert into public.outreach_events (id, lead_id, data) values
  ('zz_rls_E1', 'zz_rls_L1', '{"type":"note","detail":"zz"}'),
  ('zz_rls_E3', 'zz_rls_L3', '{"type":"note","detail":"zz"}');

-- ── Act as asha (member) ────────────────────────────────────────────────────
select set_config('request.jwt.claims', json_build_object(
  'sub', (select v from zz_ids where k = 'asha'), 'email', 'zz-rls-asha@example.invalid', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare n int; me jsonb;
begin
  me := public.crm_me();
  if me ->> 'role' is distinct from 'member' then raise exception 'FAIL: asha''s first sign-in did not link her (crm_me: %)', me; end if;
  select count(*) into n from public.outreach_leads where id like 'zz_rls_%';
  if n <> 2 then raise exception 'FAIL: a member must see only her 2 leads, saw %', n; end if;
  select count(*) into n from public.outreach_events where id like 'zz_rls_%';
  if n <> 1 then raise exception 'FAIL: a member must read only her leads'' history, read %', n; end if;
  select count(*) into n from public.crm_members;
  if n <> 1 then raise exception 'FAIL: a member must read only her own team row, read %', n; end if;
  select count(*) into n from public.crm_audit;
  if n <> 0 then raise exception 'FAIL: a member read % audit rows', n; end if;
  select count(*) into n from public.content where collection in ('applications', 'submissions', 'demoSiteOpens');
  if n <> 0 then raise exception 'FAIL: a member read % private CMS rows', n; end if;

  perform public.crm_patch_lead('zz_rls_L1', '{"status":"replied","notes":"zz call Monday"}'::jsonb);

  begin
    perform public.crm_patch_lead('zz_rls_L1', '{"phone":"+919999999999"}'::jsonb);
    raise exception 'FAIL: a member changed a filled phone number';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    perform public.crm_patch_lead('zz_rls_L1', '{"status":"won"}'::jsonb);
    raise exception 'FAIL: a member marked a lead Won';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    perform public.crm_patch_lead('zz_rls_L2', '{"status":"contacted"}'::jsonb);
    raise exception 'FAIL: a member lifted Do not contact';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    perform public.crm_patch_lead('zz_rls_L3', '{"notes":"x"}'::jsonb);
    raise exception 'FAIL: a member edited someone else''s lead';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    update public.outreach_leads set assigned_to = null where id = 'zz_rls_L1';
    raise exception 'FAIL: a member unassigned her own lead';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    insert into public.outreach_events (id, lead_id, data) values ('zz_rls_E9', 'zz_rls_L2', '{"type":"sent","channel":"whatsapp"}');
    raise exception 'FAIL: a send was logged on a Do-not-contact lead';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    insert into public.outreach_leads (id, data) values ('zz_rls_LX', '{"instituteName":"ZZ new"}');
    raise exception 'FAIL: a member added a lead without "Can add leads"';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    perform public.crm_assign_leads(array['zz_rls_L4'], (select m.id from public.crm_members m where m.email = 'zz-rls-asha@example.invalid'));
    raise exception 'FAIL: a member assigned a lead';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    perform public.crm_patch_lead('zz_rls_L1', '{"status":"call"}'::jsonb);
    raise exception 'FAIL: a member set stage Call (calls with Mehdi come from a hand-over)';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    perform public.crm_patch_lead('zz_rls_L1', '{"notes":"replaced"}'::jsonb);
    raise exception 'FAIL: a member replaced the notes (they may only add to them)';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    insert into public.outreach_events (id, lead_id, data) values ('zz_rls_E8', 'zz_rls_L1', '{"type":"sent","channel":"email","stage":"proposal"}');
    raise exception 'FAIL: a member logged a proposal (money is Mehdi''s)';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    insert into public.content (collection, doc_id, data) values ('demoSiteOpens', 'zz_rls_open', '{"id":"zz_rls_open","demoId":"zz"}');
    raise exception 'FAIL: a member wrote a demo open (only visitors may)';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    perform public.crm_patch_lead('zz_rls_L1', '{"city":{"x":1}}'::jsonb);
    raise exception 'FAIL: a member wrote an object where text belongs (it would break the CRM''s pages)';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    if sqlstate <> '22023' then raise exception 'FAIL: a non-text value was refused for the wrong reason: %', sqlerrm; end if;
  end;
  begin
    insert into public.outreach_events (id, lead_id, data) values ('zz_rls_E7', 'zz_rls_L1', '{"type":"status","detail":["Status: Contacted to Won"]}');
    raise exception 'FAIL: a member hid a "to Won" line in a list';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    if sqlstate <> '22023' then raise exception 'FAIL: a list in a history line was refused for the wrong reason: %', sqlerrm; end if;
  end;
  begin
    -- The dashboard counts "éto Won" as a win (its word break is ASCII only), whatever this database's locale says.
    insert into public.outreach_events (id, lead_id, data) values ('zz_rls_E8', 'zz_rls_L1', '{"type":"status","detail":"Status: Contacted éto Won"}');
    raise exception 'FAIL: a member wrote a "... éto Won" line (the dashboard would count it as a win)';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'FAIL: the "éto Won" line was refused for the wrong reason: %', sqlerrm; end if;
  end;
  begin
    perform public.crm_patch_lead('zz_rls_L1', '{"whatsapp":"+91 00000 00003"}'::jsonb);
    raise exception 'FAIL: a member filled in another lead''s number (written another way)';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    if sqlstate <> '23505' then raise exception 'FAIL: a borrowed number was refused for the wrong reason: %', sqlerrm; end if;
  end;
  begin
    perform public.crm_handoff('zz_rls_L1', now() + interval '2 days', 'zz');
    raise exception 'FAIL: a member booked Mehdi''s time (that is phase 2)';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    if sqlstate <> '42501' then raise exception 'FAIL: a member''s booking was refused for the wrong reason: %', sqlerrm; end if;
  end;

  delete from public.outreach_leads where id = 'zz_rls_L1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a member deleted a lead'; end if;
  delete from public.outreach_events where id = 'zz_rls_E1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a member deleted history'; end if;

  insert into public.outreach_events (id, lead_id, data, created_at)
  values ('zz_rls_E2', 'zz_rls_L1', '{"type":"call","at":"2020-01-01T00:00:00.000Z"}', '2020-01-01');
  if (select created_at < now() - interval '1 hour' from public.outreach_events where id = 'zz_rls_E2') then
    raise exception 'FAIL: a member backdated a history line';
  end if;
  if (select actor_id from public.outreach_events where id = 'zz_rls_E2')
     is distinct from (select m.id from public.crm_members m where m.email = 'zz-rls-asha@example.invalid') then
    raise exception 'FAIL: a history line is not signed by its writer';
  end if;
end $$;

-- ── Act as bilal (member, See all) ──────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select v from zz_ids where k = 'bilal'), 'email', 'zz-rls-bilal@example.invalid', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare n int;
begin
  perform public.crm_me();
  select count(*) into n from public.outreach_leads where id like 'zz_rls_%';
  if n <> 1 then raise exception 'FAIL: "See all" must not open other leads'' full rows (saw %)', n; end if;
  select count(*) into n from public.crm_leads_overview() o where o.id like 'zz_rls_%';
  if n <> 7 then raise exception 'FAIL: "See all" must list all 7 fake leads in the overview, listed %', n; end if;
  update public.outreach_leads set data = data || '{"notes":"x"}' where id = 'zz_rls_L1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: "See all" edited someone else''s lead'; end if;
  if (select visible from public.crm_find_duplicate('+910000000001', null)) then
    raise exception 'FAIL: the duplicate check opened asha''s lead to bilal';
  end if;
  begin
    insert into public.outreach_leads (id, data) values ('zz_rls_LQ', '{"instituteName":"ZZ probe","phone":"+910000000001"}');
    raise exception 'FAIL: a member without "Can add leads" added a lead';
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    if sqlstate <> '42501' or sqlerrm like '%ZZ Asha%' then
      raise exception 'FAIL: a refused insert told bilal whose number it is: %', sqlerrm;
    end if;
  end;
end $$;

-- ── Act as ayesha (admin) ───────────────────────────────────────────────────
reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select v from zz_ids where k = 'ayesha'), 'email', 'zz-rls-ayesha@example.invalid', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare n int;
begin
  perform public.crm_me();
  select count(*) into n from public.outreach_leads where id like 'zz_rls_%';
  if n <> 7 then raise exception 'FAIL: an admin must see all 7 fake leads, saw %', n; end if;
  perform public.crm_assign_leads(array['zz_rls_L4'], (select m.id from public.crm_members m where m.email = 'zz-rls-bilal@example.invalid'));
  delete from public.outreach_leads where id = 'zz_rls_L5';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: an admin deleted a lead'; end if;
  select count(*) into n from public.crm_audit;
  if n <> 0 then raise exception 'FAIL: an admin read the audit trail'; end if;
  begin
    perform public.crm_patch_lead('zz_rls_L3', '{"status":"won"}'::jsonb);
    raise exception 'FAIL: an admin marked a lead Won';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
  begin
    perform public.crm_assign_leads(array['zz_rls_L5','zz_rls_L6','zz_rls_L7'], (select m.id from public.crm_members m where m.email = 'zz-rls-asha@example.invalid'));
    raise exception 'FAIL: a member was pushed past her New-lead cap';
  exception when others then if sqlerrm like 'FAIL:%' then raise; end if; end;
end $$;

-- ── Act as dev (a login nobody invited), then as a signed-out visitor ───────
reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select v from zz_ids where k = 'dev'), 'email', 'zz-rls-dev@example.invalid', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare n int;
begin
  if public.crm_me() ->> 'role' is not null then raise exception 'FAIL: an uninvited login got a role'; end if;
  select count(*) into n from public.outreach_leads;
  if n <> 0 then raise exception 'FAIL: an uninvited login saw % leads', n; end if;
  select count(*) into n from public.outreach_settings;
  if n <> 0 then raise exception 'FAIL: an uninvited login read the settings'; end if;
end $$;

reset role;
set local role anon;
do $$ begin
  begin
    perform count(*) from public.outreach_leads;
    raise exception 'FAIL: a signed-out visitor read the leads table';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.crm_members;
    raise exception 'FAIL: a signed-out visitor read the team';
  exception when insufficient_privilege then null; end;
end $$;

-- ── The owner switches asha off: from her very next query she sees nothing ──
reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select v from zz_ids where k = 'owner_uid'),
  'email', (select lower(a.email) from public.admins a order by a.email limit 1),
  'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  perform public.crm_deactivate_member((select m.id from public.crm_members m where m.email = 'zz-rls-asha@example.invalid'), null);
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', (select v from zz_ids where k = 'asha'), 'email', 'zz-rls-asha@example.invalid', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.outreach_leads;
  if n <> 0 then raise exception 'FAIL: a switched-off member still saw % leads', n; end if;
end $$;

reset role;
select 'ALL CRM ACCESS CHECKS PASSED' as result;
rollback;
