-- ════════════════════════════════════════════════════════════════════════════
-- 0014, the client file: its rules, checked on the REAL Supabase project.
-- Run AFTER 0014, in Supabase > SQL Editor > New query > paste all > Run. It
-- works with or without 0011 to 0013.
--
-- Everything happens inside ONE transaction that ends in ROLLBACK: it adds a
-- fake login (zz-clients-...@example.invalid), a fake client, project,
-- documents and payments (ids cl_zztest..., pr_zztest..., dc_zztest...,
-- py_zztest...), issues some of them, then acts as a visitor, a plain login and
-- Mehdi exactly as the API does (role + login claims). It stops with
--   ERROR: FAIL: <the rule that did not hold>
-- at the first broken rule. Nothing it writes survives: no number it issues
-- is used up (the counters roll back with everything else), and the fake
-- client and project carry codes of their own, so the IDV-C and IDV-PR
-- sequences are not touched. It reads no real row: it only counts that the
-- others get none. Success ends with one row: ALL CLIENT FILE CHECKS PASSED.
--
-- The same rules, and many more, run locally in scripts/test-clients-rls.mjs.
-- ════════════════════════════════════════════════════════════════════════════
begin;

-- ── 0014 is there, closed to everyone but the owner ─────────────────────────
do $$
declare t text;
begin
  if to_regprocedure('public.crm_issue_document(text)') is null then
    raise exception 'FAIL: 0014 has not been run: paste supabase/migrations/0014_client_process.sql and Run it first';
  end if;
  foreach t in array array['crm_client_settings', 'crm_clients', 'crm_projects', 'crm_documents', 'crm_payments',
                           'crm_client_events', 'crm_doc_counters'] loop
    if to_regclass('public.' || t) is null then raise exception 'FAIL: public.% is missing', t; end if;
    if not (select c.relrowsecurity from pg_class c where c.oid = ('public.' || t)::regclass) then
      raise exception 'FAIL: row security is off on public.%', t;
    end if;
    if has_table_privilege('anon', 'public.' || t, 'select') or has_table_privilege('anon', 'public.' || t, 'insert') then
      raise exception 'FAIL: a visitor (anon) has a grant on public.%', t;
    end if;
    if (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = t) <> 1 then
      raise exception 'FAIL: public.% should have exactly one policy, the owner''s', t;
    end if;
  end loop;
  if has_function_privilege('public', 'public.crm_issue_document(text)', 'execute')
     or has_function_privilege('anon', 'public.crm_issue_document(text)', 'execute') then
    raise exception 'FAIL: a visitor may run crm_issue_document; only logins should (and it refuses all but the owner)';
  end if;
  if not has_function_privilege('authenticated', 'public.crm_issue_document(text)', 'execute') then
    raise exception 'FAIL: logins cannot run crm_issue_document: Mehdi could not issue a document';
  end if;
  if has_table_privilege('authenticated', 'public.crm_client_events', 'update')
     or has_table_privilege('authenticated', 'public.crm_client_events', 'delete')
     or has_table_privilege('authenticated', 'public.crm_payments', 'delete')
     or has_table_privilege('authenticated', 'public.crm_doc_counters', 'update') then
    raise exception 'FAIL: the timeline, payments or counters can be changed or deleted through the API';
  end if;
end $$;

create temporary table zz_cl (k text primary key, v text) on commit drop;
insert into auth.users (id, email, email_confirmed_at, aud, role)
values (gen_random_uuid(), 'zz-clients-plain@example.invalid', now(), 'authenticated', 'authenticated');
insert into zz_cl select 'plain_uid', id::text from auth.users where email = 'zz-clients-plain@example.invalid';
insert into zz_cl select 'owner_uid', u.id::text from auth.users u
 where lower(u.email) = (select lower(a.email) from public.admins a order by a.email limit 1);
insert into zz_cl values ('owner_email', (select lower(a.email) from public.admins a order by a.email limit 1));
grant select, insert, update on zz_cl to anon, authenticated;

do $$ begin
  if (select count(*) from zz_cl where k = 'owner_uid') <> 1 then
    raise exception 'FAIL: no login matches the e-mail in public.admins: create Mehdi''s login first';
  end if;
end $$;

-- ── Mehdi: a client, a project, drafts, numbers in order, frozen once issued ──
select set_config('request.jwt.claims', json_build_object('sub', (select v from zz_cl where k = 'owner_uid'),
  'email', (select v from zz_cl where k = 'owner_email'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare
  a jsonb; b jsonb; c jsonb; n1 int; n2 int; n3 int; at_ts timestamptz;
begin
  if not public.is_admin() then raise exception 'FAIL: the claims of the e-mail in public.admins do not make is_admin() true'; end if;
  insert into public.crm_clients (id, code, data) values ('cl_zztest01', 'ZZ-C-TEST-1', '{"orgName":"ZZ Example School"}');
  insert into public.crm_clients (id, code, data) values ('cl_zztest02', 'ZZ-C-TEST-2', '{"orgName":"ZZ Other"}');
  insert into public.crm_projects (id, code, client_id, fee, data) values ('pr_zztest01', 'ZZ-PR-TEST-1', 'cl_zztest01', 18000, '{}');
  insert into public.crm_projects (id, code, client_id, fee, data) values ('pr_zztest02', 'ZZ-PR-TEST-2', 'cl_zztest02', 12000, '{}');
  insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
    ('dc_zztest01', 'cl_zztest01', 'pr_zztest01', 'proforma', 'ADVANCE_50', 9000, '{}'),
    ('dc_zztest02', 'cl_zztest01', 'pr_zztest01', 'proforma', null, null, '{}'),
    ('dc_zztest03', 'cl_zztest01', 'pr_zztest01', 'proforma', null, 9000, '{}'),
    ('dc_zztest04', 'cl_zztest01', 'pr_zztest01', 'welcome', null, null, '{}');

  a := public.crm_issue_document('dc_zztest01');
  if a ->> 'number' !~ '^IDV/PI/[0-9]{4}-[0-9]{2}/[0-9]{3,}$' then raise exception 'FAIL: a proforma number reads %', a ->> 'number'; end if;
  if (a ->> 'due_on')::date <> (a ->> 'issued_on')::date + 7 or (a ->> 'valid_until')::date <> (a ->> 'issued_on')::date + 15 then
    raise exception 'FAIL: the server did not set the due date (+7) and the validity (+15): %', a;
  end if;
  n1 := (a ->> 'serial')::int;
  begin
    perform public.crm_issue_document('dc_zztest02');
    raise exception 'FAIL: a proforma with no amount was issued';
  exception when sqlstate '22023' then null; end;
  b := public.crm_issue_document('dc_zztest03');
  n2 := (b ->> 'serial')::int;
  if n2 <> n1 + 1 then raise exception 'FAIL: after a refused issue the next proforma is % instead of %', n2, n1 + 1; end if;
  c := public.crm_issue_document('dc_zztest04');
  if c ->> 'status' <> 'issued' or c ->> 'number' is not null then raise exception 'FAIL: a welcome pack is not finalised without a number: %', c; end if;

  begin
    update public.crm_documents set amount = 1 where id = 'dc_zztest01';
    raise exception 'FAIL: an issued document''s amount changed';
  exception when sqlstate '42501' then null; end;
  begin
    update public.crm_documents set status = 'cancelled' where id = 'dc_zztest03';
    raise exception 'FAIL: an issued document was cancelled without a reason';
  exception when sqlstate '42501' or sqlstate '23514' then null; end;
  begin
    delete from public.crm_documents where id = 'dc_zztest03';
    raise exception 'FAIL: an issued document was deleted';
  exception when sqlstate '42501' then null; end;
  update public.crm_documents set status = 'cancelled', cancel_reason = 'ZZ test' where id = 'dc_zztest04';
  if (select status from public.crm_documents where id = 'dc_zztest04') <> 'cancelled' then
    raise exception 'FAIL: an issued welcome pack (no number) could not be cancelled with a reason';
  end if;
  begin
    insert into public.crm_documents (id, client_id, project_id, kind, status, series, fy, serial, number, amount, data)
    values ('dc_zztest05', 'cl_zztest01', 'pr_zztest01', 'invoice', 'issued', 'INV', '2026-27', 999, 'IDV/2026-27/999', 1, '{}');
    raise exception 'FAIL: a document was inserted already issued, with a number of its own';
  exception when sqlstate '42501' then null; end;
  begin
    insert into public.crm_documents (id, client_id, project_id, kind, series, fy, serial, amount, data)
    values ('dc_zztest06', 'cl_zztest01', 'pr_zztest01', 'proforma', 'PI', '2026-27', 500, 9000, '{}');
    raise exception 'FAIL: a draft carried a serial';
  exception when sqlstate '42501' then null; end;
  begin
    insert into public.crm_documents (id, client_id, project_id, kind, amount, data)
    values ('dc_zztest07', 'cl_zztest01', 'pr_zztest02', 'invoice', 100, '{}');
    raise exception 'FAIL: a document sat under one client and another client''s project';
  exception when sqlstate '23514' then null; end;
  begin
    update public.crm_projects set client_id = 'cl_zztest02' where id = 'pr_zztest01';
    raise exception 'FAIL: a project moved to another client, with its issued documents';
  exception when sqlstate '42501' then null; end;

  -- The advance is billed once: one issued proforma per part of the advance, and part 2 only with a split advance.
  insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
    ('dc_zztest16', 'cl_zztest01', 'pr_zztest01', 'proforma', 'ADVANCE_50', 9000, '{}'),
    ('dc_zztest17', 'cl_zztest01', 'pr_zztest01', 'proforma', 'ADVANCE_50', 4500, '{"part":2}');
  begin
    perform public.crm_issue_document('dc_zztest16');
    raise exception 'FAIL: a second proforma for the same advance was issued';
  exception when sqlstate '23505' then null; end;
  begin
    perform public.crm_issue_document('dc_zztest17');
    raise exception 'FAIL: a part 2 proforma was issued on a project with no split advance';
  exception when sqlstate '23514' then null; end;
  insert into public.crm_projects (id, code, client_id, fee, data) values ('pr_zztest03', 'ZZ-PR-TEST-3', 'cl_zztest01', 18000,
    '{"splitAdvance":{"partnerApprovedAt":"2026-10-04","channel":"whatsapp","part1":0,"part2":0,"part2DueOn":"2026-10-20"}}');
  insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
    ('dc_zztest18', 'cl_zztest01', 'pr_zztest03', 'proforma', 'ADVANCE_50', 4500, '{"part":1}'),
    ('dc_zztest19', 'cl_zztest01', 'pr_zztest03', 'proforma', 'ADVANCE_50', 4500, '{"part":2}'),
    ('dc_zztest20', 'cl_zztest01', 'pr_zztest03', 'proforma', 'ADVANCE_50', 4500, '{"part":2}');
  perform public.crm_issue_document('dc_zztest18');
  perform public.crm_issue_document('dc_zztest19');
  begin
    perform public.crm_issue_document('dc_zztest20');
    raise exception 'FAIL: part 2 of a split advance was billed twice';
  exception when sqlstate '23505' then null; end;
  update public.crm_documents set status = 'cancelled', cancel_reason = 'ZZ wrong part 2' where id = 'dc_zztest19';
  perform public.crm_issue_document('dc_zztest20');
  if (select status from public.crm_documents where id = 'dc_zztest20') <> 'issued' then
    raise exception 'FAIL: a part 2 cancelled with a reason could not be made again';
  end if;
  -- A change request's advance is billed once too.
  insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data) values
    ('dc_zztest21', 'cl_zztest01', 'pr_zztest03', 'proforma', 'CHANGE_REQUEST', 2000, '{"crNo":"CR-01"}'),
    ('dc_zztest22', 'cl_zztest01', 'pr_zztest03', 'proforma', 'CHANGE_REQUEST', 2000, '{"crNo":"CR-01"}'),
    ('dc_zztest23', 'cl_zztest01', 'pr_zztest03', 'proforma', 'CHANGE_REQUEST', 1000, '{"crNo":"CR-02"}');
  perform public.crm_issue_document('dc_zztest21');
  begin
    perform public.crm_issue_document('dc_zztest22');
    raise exception 'FAIL: a change request''s advance was billed twice';
  exception when sqlstate '23505' then null; end;
  perform public.crm_issue_document('dc_zztest23');
  -- A proforma refunded in full by a credit note (code F) no longer counts: that advance may be billed again.
  insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, related_doc, data) values
    ('dc_zztest24', 'cl_zztest01', 'pr_zztest03', 'credit_note', null, 4500, 'dc_zztest18',
     '{"reasonCode":"F","partnersApproval":{"at":"2026-10-04","channel":"whatsapp"}}'),
    ('dc_zztest25', 'cl_zztest01', 'pr_zztest03', 'proforma', 'ADVANCE_50', 4500, null, '{"part":1}');
  begin
    perform public.crm_issue_document('dc_zztest25');
    raise exception 'FAIL: part 1 of the advance was billed twice while its proforma stood';
  exception when sqlstate '23505' then null; end;
  perform public.crm_issue_document('dc_zztest24');
  perform public.crm_issue_document('dc_zztest25');
  if (select status from public.crm_documents where id = 'dc_zztest25') <> 'issued' then
    raise exception 'FAIL: an advance refunded in full by a credit note could not be billed again';
  end if;

  -- A timeline line belongs to the client of its project.
  begin
    insert into public.crm_client_events (client_id, project_id, type, detail) values ('cl_zztest02', 'pr_zztest01', 'note', 'ZZ');
    raise exception 'FAIL: a timeline line was filed under one client with another client''s project';
  exception when sqlstate '23514' then null; end;

  -- Payments: only against an issued proforma or invoice of the same client and project; never moved or deleted.
  insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data)
  values ('dc_zztest08', 'cl_zztest01', 'pr_zztest01', 'proforma', 'ADVANCE_50', 9000, '{}');
  begin
    insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, mode, reference)
    values ('py_zztest09', 'cl_zztest01', 'pr_zztest01', 'dc_zztest08', current_date, 100, 'upi', 'ZZ');
    raise exception 'FAIL: a payment was recorded against a draft';
  exception when sqlstate '23514' then null; end;
  begin
    insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, mode, reference)
    values ('py_zztest10', 'cl_zztest02', 'pr_zztest02', 'dc_zztest01', current_date, 100, 'upi', 'ZZ');
    raise exception 'FAIL: a payment from one client was recorded against another client''s proforma';
  exception when sqlstate '23514' then null; end;
  insert into public.crm_payments (id, client_id, project_id, against_doc, received_on, amount, tds, mode, reference)
  values ('py_zztest01', 'cl_zztest01', 'pr_zztest01', 'dc_zztest01', current_date, 8820, 180, 'neft', 'ZZUTR01');
  begin
    update public.crm_payments set client_id = 'cl_zztest02', project_id = 'pr_zztest02' where id = 'py_zztest01';
    raise exception 'FAIL: a recorded payment moved to another client';
  exception when sqlstate '42501' then null; end;
  begin
    delete from public.crm_payments where id = 'py_zztest01';
    raise exception 'FAIL: a payment was deleted';
  exception when sqlstate '42501' or sqlstate '23503' then null; end;
  begin
    update public.crm_documents set status = 'cancelled', cancel_reason = 'ZZ' where id = 'dc_zztest01';
    raise exception 'FAIL: a proforma money was received against was cancelled';
  exception when sqlstate '42501' then null; end;

  -- Receipts: one per payment, for the amount credited.
  insert into public.crm_documents (id, client_id, project_id, kind, amount, payment_id, related_doc, data)
  values ('dc_zztest11', 'cl_zztest01', 'pr_zztest01', 'receipt', 9000, 'py_zztest01', 'dc_zztest01', '{}');
  begin
    perform public.crm_issue_document('dc_zztest11');
    raise exception 'FAIL: a receipt for more than was credited was issued';
  exception when sqlstate '23514' then null; end;
  update public.crm_documents set amount = 8820 where id = 'dc_zztest11';
  a := public.crm_issue_document('dc_zztest11');
  if a ->> 'number' !~ '^IDV/RC/[0-9]{4}-[0-9]{2}/[0-9]{3,}$' then raise exception 'FAIL: a receipt number reads %', a ->> 'number'; end if;
  insert into public.crm_documents (id, client_id, project_id, kind, amount, payment_id, related_doc, data)
  values ('dc_zztest12', 'cl_zztest01', 'pr_zztest01', 'receipt', 8820, 'py_zztest01', 'dc_zztest01', '{}');
  begin
    perform public.crm_issue_document('dc_zztest12');
    raise exception 'FAIL: a second receipt for the same payment was issued';
  exception when sqlstate '23505' then null; end;
  begin
    update public.crm_payments set status = 'voided', void_reason = 'ZZ' where id = 'py_zztest01';
    raise exception 'FAIL: a payment with an issued receipt was voided';
  exception when sqlstate '42501' then null; end;

  -- Credit notes: against an issued invoice, with both partners' written yes.
  insert into public.crm_documents (id, client_id, project_id, kind, milestone, amount, data)
  values ('dc_zztest13', 'cl_zztest01', 'pr_zztest01', 'invoice', 'LAUNCH_50', 9000, '{}');
  perform public.crm_issue_document('dc_zztest13');
  insert into public.crm_documents (id, client_id, project_id, kind, amount, related_doc, data)
  values ('dc_zztest14', 'cl_zztest01', 'pr_zztest01', 'credit_note', 1000, 'dc_zztest13', '{"reasonCode":"D"}');
  begin
    perform public.crm_issue_document('dc_zztest14');
    raise exception 'FAIL: a credit note without both partners'' written yes was issued';
  exception when sqlstate '23514' then null; end;
  insert into public.crm_documents (id, client_id, project_id, kind, amount, related_doc, data)
  values ('dc_zztest15', 'cl_zztest01', 'pr_zztest01', 'credit_note', 9500, 'dc_zztest13',
          '{"reasonCode":"D","partnersApproval":{"at":"2026-10-04","channel":"whatsapp"}}');
  begin
    perform public.crm_issue_document('dc_zztest15');
    raise exception 'FAIL: a credit note above its invoice was issued';
  exception when sqlstate '23514' then null; end;

  -- The timeline's time is the server's; a project with issued documents is never deleted.
  insert into public.crm_client_events (client_id, project_id, type, at) values ('cl_zztest01', 'pr_zztest01', 'approval', '2020-01-01')
  returning at into at_ts;
  if at_ts < now() - interval '1 minute' then raise exception 'FAIL: a timeline line was back-dated to %', at_ts; end if;
  begin
    delete from public.crm_projects where id = 'pr_zztest01';
    raise exception 'FAIL: a project with issued documents was deleted';
  exception when sqlstate '42501' then null; end;
end $$;
reset role;

-- ── A plain login (not Mehdi): reads nothing, writes nothing, issues nothing ─
select set_config('request.jwt.claims', json_build_object('sub', (select v from zz_cl where k = 'plain_uid'),
  'email', 'zz-clients-plain@example.invalid', 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  select (select count(*) from public.crm_clients) + (select count(*) from public.crm_projects)
       + (select count(*) from public.crm_documents) + (select count(*) from public.crm_payments)
       + (select count(*) from public.crm_client_events) + (select count(*) from public.crm_client_settings)
       + (select count(*) from public.crm_doc_counters) into n;
  if n <> 0 then raise exception 'FAIL: a login that is not Mehdi reads % client-file rows', n; end if;
  begin
    insert into public.crm_clients (id, code, data) values ('cl_zztest09', 'ZZ-C-TEST-9', '{}');
    raise exception 'FAIL: a login that is not Mehdi added a client';
  exception when sqlstate '42501' then null; end;
  begin
    perform public.crm_issue_document('dc_zztest03');
    raise exception 'FAIL: a login that is not Mehdi ran crm_issue_document';
  exception when sqlstate '42501' then null; end;
end $$;
reset role;

-- ── A visitor (anon): the tables are closed ─────────────────────────────────
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$ begin
  begin perform count(*) from public.crm_clients;   raise exception 'FAIL: a visitor read crm_clients';   exception when insufficient_privilege then null; end;
  begin perform count(*) from public.crm_documents; raise exception 'FAIL: a visitor read crm_documents'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.crm_payments;  raise exception 'FAIL: a visitor read crm_payments';  exception when insufficient_privilege then null; end;
  begin perform public.crm_issue_document('dc_zztest03'); raise exception 'FAIL: a visitor ran crm_issue_document'; exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'ALL CLIENT FILE CHECKS PASSED' as result;
rollback;
