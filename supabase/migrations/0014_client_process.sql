-- ════════════════════════════════════════════════════════════════════════════
-- 0014: The client file. When a lead says yes, the CRM carries that client
-- through the whole journey, from the proposal to the exit or the care plan:
-- the client, its projects, its numbered documents, its payments and its
-- timeline.
-- Written 4 October 2026. Needs 0005 and 0007. Safe to run more than once,
-- and on its own after 0013: paste only this file into Supabase > SQL Editor
-- > New query > Run. It needs nothing from 0011, 0012 or 0013 and works with
-- or without them.
-- ════════════════════════════════════════════════════════════════════════════
--
-- WHO MAY DO WHAT
--   The owner only (Mehdi: whoever public.is_admin() says, 0005). Money is
--   never delegated (09-crm/CRM-TEAM-RUNBOOK.md section 0), and a client file
--   is money from its first line. Each of the seven tables has row security
--   and one policy, "the owner, for everything": a member, an admin and a
--   visitor read nothing and write nothing. A visitor (anon) has no grant at
--   all. Numbers are given by one function, public.crm_issue_document, which
--   refuses anyone but the owner.
--
-- WHAT IS KEPT
--   crm_client_settings   one row: the firm's billing details, the policy
--                         numbers, the first serial of a series, approved wording
--   crm_clients           one per organisation (IDV-C-0001), at most one per lead
--   crm_projects          one per engagement (IDV-PR-0001), at one of twelve stages
--   crm_documents         quotations, proformas, invoices, receipts, credit notes,
--                         and the welcome pack, handover document, closing letter
--   crm_payments          one per credit in the bank, never deleted
--   crm_client_events     the client's timeline, append-only, stamped by the server
--   crm_doc_counters      the last serial of each series in each financial year
--   No table has a column for a password.
--
-- WHAT THE DATABASE ENFORCES (the CRM only shows it; README-BILLING section 3)
--   * Numbers: IDV/Q/, IDV/PI/, IDV/, IDV/RC/ and IDV/CN/, then the financial
--     year (India's, from the India date at the moment of issue) and a serial of
--     at least three digits, consecutive and never reused. A number is taken
--     only by crm_issue_document, inside one transaction, so a refused or failed
--     issue leaves no gap. A document is inserted only as a draft, and a draft
--     never carries a number, serial, year, series or issue date.
--   * An issued document never changes and is never deleted. A mistake is
--     cancelled with a reason (it stays in the register) and a new one issued.
--     A document money was received against, or that a receipt or a credit note
--     points at, is corrected with a credit note, never cancelled.
--   * A payment is recorded only against an issued proforma or invoice of the
--     same client and project. It never moves, is never deleted, and is voided
--     only with a reason, once its receipt is cancelled. One issued receipt per
--     payment, for exactly the amount credited.
--   * A credit note reduces one issued invoice of the same client (or, refunding
--     an advance, its proforma: code F), needs both partners' written yes
--     recorded on it (SOP-09 note 5), and the credit notes against one document
--     never add up to more than it.
--   * A document belongs to the client of its project.
--   * The advance is billed once: a project has at most one issued proforma for
--     the advance (or a split advance's part 1), one for part 2, and one for
--     each change request's advance, and part 2 only when the project has a
--     split advance. A wrong one is cancelled with a reason first; one refunded
--     in full by credit notes no longer counts.
--   * A project stays with the client it was opened for, and one with an issued
--     document or a payment is closed, never deleted.
--   * The timeline's time is the server's: nothing can be back-dated. A line
--     belongs to the client of its project.
--   * Deleting a lead keeps its client file (the link is cleared).
--
-- No dynamic SQL anywhere in this file. It ends by telling PostgREST to reload.
-- The full check, on a copy of the rules: scripts/test-clients-rls.mjs (PGlite).
-- On the live project, after running this file: supabase/tests/clients_rls.sql.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 0. What this file needs ─────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.is_admin()') is null or to_regclass('public.outreach_leads') is null then
    raise exception '0014 needs 0005 and 0007: run supabase/SETUP_ALL.sql (or 0001 to 0013) first';
  end if;
end $$;


-- ── 0b. A schema the Data API does not expose (as 0011 makes it) ───────────
-- The guards and helpers live here: PostgREST serves only the public schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ── 1. Tables ───────────────────────────────────────────────────────────────
create sequence if not exists public.crm_client_code_seq;
create sequence if not exists public.crm_project_code_seq;

create table if not exists public.crm_client_settings (
  id          text primary key check (id = 'default'),
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 32000),
  updated_at  timestamptz not null default now()
);

create table if not exists public.crm_clients (
  id          text primary key check (id ~ '^cl_[A-Za-z0-9_-]{6,40}$'),
  code        text not null unique default ('IDV-C-' || lpad(nextval('public.crm_client_code_seq')::text, 4, '0')),
  lead_id     text references public.outreach_leads (id) on delete set null,
  status      text not null default 'active' check (status in ('active', 'in_warranty', 'dormant', 'churned', 'archived')),
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 64000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- One client per lead: a second project for the same lead reuses the client (spec 9 openFromLead), and a double
-- press on "Open client file" cannot make two clients.
create unique index if not exists crm_clients_lead_idx on public.crm_clients (lead_id) where lead_id is not null;

create table if not exists public.crm_projects (
  id          text primary key check (id ~ '^pr_[A-Za-z0-9_-]{6,40}$'),
  code        text not null unique default ('IDV-PR-' || lpad(nextval('public.crm_project_code_seq')::text, 4, '0')),
  client_id   text not null references public.crm_clients (id) on delete restrict,
  lead_id     text references public.outreach_leads (id) on delete set null,
  kind        text not null default 'website' check (kind in ('landing', 'website', 'portal', 'software', 'other')),
  stage       text not null default 'proposal' check (stage in ('proposal', 'agreement', 'welcome', 'kickoff', 'content', 'design',
                                                             'build', 'review', 'launch', 'handover', 'support', 'aftercare')),
  hold        text check (hold in ('client_delay', 'non_payment', 'no_advance')),
  outcome     text check (outcome in ('lost', 'cancelled', 'closed')),
  fee         integer check (fee is null or fee between 0 and 100000000),
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 128000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz
);
create index if not exists crm_projects_client_idx on public.crm_projects (client_id);
create index if not exists crm_projects_lead_idx on public.crm_projects (lead_id);

create table if not exists public.crm_doc_counters (
  series       text not null check (series in ('Q', 'PI', 'INV', 'RC', 'CN')),
  fy           text not null check (fy ~ '^[0-9]{4}-[0-9]{2}$'),
  last_serial  integer not null default 0 check (last_serial >= 0),
  primary key (series, fy)
);

create table if not exists public.crm_payments (
  id            text primary key check (id ~ '^py_[A-Za-z0-9_-]{6,40}$'),
  client_id     text not null references public.crm_clients (id) on delete restrict,
  project_id    text references public.crm_projects (id) on delete restrict,
  against_doc   text not null,                          -- the issued proforma or invoice it settles (FK added below; the guard checks it)
  received_on   date not null,
  amount        integer not null check (amount between 0 and 100000000),
  tds           integer not null default 0 check (tds between 0 and 100000000),
  mode          text not null check (mode in ('upi', 'neft', 'imps', 'rtgs', 'cheque', 'other')),
  reference     text check (length(reference) <= 80),
  status        text not null default 'recorded' check (status in ('recorded', 'voided')),
  void_reason   text check (length(void_reason) <= 300),
  note          text check (length(note) <= 500),
  created_at    timestamptz not null default now(),
  check (amount + tds > 0),
  check (status = 'recorded' or length(trim(coalesce(void_reason, ''))) > 0)
);

create table if not exists public.crm_documents (
  id             text primary key check (id ~ '^dc_[A-Za-z0-9_-]{6,40}$'),
  client_id      text not null references public.crm_clients (id) on delete restrict,
  project_id     text references public.crm_projects (id) on delete cascade,   -- drafts go with a deleted project; issued ones block it (guard)
  kind           text not null check (kind in ('quotation', 'proforma', 'invoice', 'receipt', 'credit_note',
                                                'welcome', 'handover', 'care_plan', 'closing', 'change_request')),
  milestone      text check (milestone in ('ADVANCE_50', 'LAUNCH_50', 'CHANGE_REQUEST', 'AMC', 'HOSTING_PASSTHROUGH', 'OTHER')),
  status         text not null default 'draft' check (status in ('draft', 'issued', 'cancelled')),
  series         text check (series in ('Q', 'PI', 'INV', 'RC', 'CN')),
  fy             text,
  serial         integer,
  number         text unique,
  issued_on      date,
  due_on         date,
  valid_until    date,
  amount         integer check (amount is null or amount between 0 and 100000000),
  payment_id     text references public.crm_payments (id) on delete restrict,  -- a receipt's credit
  related_doc    text references public.crm_documents (id) on delete restrict, -- a receipt's or credit note's invoice
  data           jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 64000),
  issued_at      timestamptz,
  cancelled_at   timestamptz,
  cancel_reason  text check (length(cancel_reason) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (number is null or status <> 'draft'),
  check (status = 'draft' or series is null or number is not null),
  check (status <> 'cancelled' or length(trim(coalesce(cancel_reason, ''))) > 0)
);
create index if not exists crm_documents_project_idx on public.crm_documents (project_id);
create index if not exists crm_documents_client_idx on public.crm_documents (client_id);
create index if not exists crm_documents_related_idx on public.crm_documents (related_doc);
-- One issued receipt per payment (a cancelled receipt frees the payment for a new one).
create unique index if not exists crm_documents_one_receipt on public.crm_documents (payment_id)
  where kind = 'receipt' and status = 'issued';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'crm_payments_against_doc_fkey') then
    alter table public.crm_payments add constraint crm_payments_against_doc_fkey
      foreign key (against_doc) references public.crm_documents (id) on delete restrict;
  end if;
end $$;

create table if not exists public.crm_client_events (
  id          bigint generated always as identity primary key,
  client_id   text not null references public.crm_clients (id) on delete cascade,
  project_id  text references public.crm_projects (id) on delete set null,   -- a deleted (drafts-only) project keeps its lines on the client
  at          timestamptz not null default now(),
  type        text not null check (type in ('sent', 'note', 'stage', 'item', 'doc', 'payment', 'approval', 'call', 'reply', 'hold')),
  channel     text check (channel in ('whatsapp', 'email', 'call', 'meeting', 'post')),
  template_id text check (length(template_id) <= 80),
  detail      text check (length(detail) <= 2000),
  data        jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 4000)
);
create index if not exists crm_client_events_project_idx on public.crm_client_events (project_id, at desc);

-- ── 2. Guards ───────────────────────────────────────────────────────────────
create or replace function private.crm_fy(d date) returns text language sql immutable set search_path = '' as $$
  select case when extract(month from d) >= 4
              then extract(year from d)::int::text || '-' || lpad(((extract(year from d)::int + 1) % 100)::text, 2, '0')
              else (extract(year from d)::int - 1)::text || '-' || lpad((extract(year from d)::int % 100)::text, 2, '0') end
$$;

create or replace function private.crm_ist_today() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Kolkata')::date
$$;

create or replace function private.crm_touch() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function private.crm_documents_guard() returns trigger language plpgsql set search_path = '' as $$
declare
  v_project_client text;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'An issued document is never deleted. Cancel it with a reason instead.' using errcode = '42501';
    end if;
    return old;
  end if;
  -- A document belongs to the client of its project: no PDF can carry one client's project under another's name.
  if new.project_id is not null then
    select p.client_id into v_project_client from public.crm_projects p where p.id = new.project_id;
    if v_project_client is distinct from new.client_id then
      raise exception 'A document belongs to the client of its project.' using errcode = '23514';
    end if;
  end if;
  -- A draft carries nothing that only Issue sets: no number, serial, year, series or issue dates, and a row is never
  -- inserted already issued. (Without this a draft holding serial 50 made the next number 051, and an "issued"
  -- invoice with a number of the browser's choosing could be inserted directly.)
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'A document starts as a draft. Issue it with crm_issue_document.' using errcode = '42501';
    end if;
    if new.number is not null or new.serial is not null or new.fy is not null or new.series is not null
       or new.issued_on is not null or new.due_on is not null or new.valid_until is not null
       or new.issued_at is not null or new.cancelled_at is not null or new.cancel_reason is not null then
      raise exception 'A draft has no number or issue dates: crm_issue_document sets them.' using errcode = '42501';
    end if;
    return new;
  end if;
  -- UPDATE
  if old.status = 'draft' then
    if new.status <> 'draft' then
      -- A draft never becomes issued except through crm_issue_document (it sets this flag for its own update).
      if coalesce(current_setting('crm.issuing', true), '') <> old.id then
        raise exception 'Documents are issued only by crm_issue_document.' using errcode = '42501';
      end if;
      return new;
    end if;
    if new.number is not null or new.serial is not null or new.fy is not null or new.series is not null
       or new.issued_on is not null or new.due_on is not null or new.valid_until is not null
       or new.issued_at is not null or new.cancelled_at is not null or new.cancel_reason is not null then
      raise exception 'A draft has no number or issue dates: crm_issue_document sets them.' using errcode = '42501';
    end if;
    return new;
  end if;
  if old.status = 'cancelled' then
    raise exception 'A cancelled document does not change.' using errcode = '42501';
  end if;
  -- issued: only cancel, with a reason; nothing else moves. Every comparison is null-safe: a welcome pack or a
  -- handover document has no number, and "null = null" would have made it impossible to cancel.
  if new.status = 'cancelled'
     and new.id = old.id and new.kind = old.kind and new.number is not distinct from old.number
     and new.serial is not distinct from old.serial
     and new.series is not distinct from old.series and new.fy is not distinct from old.fy
     and new.amount is not distinct from old.amount and new.data = old.data
     and new.issued_on is not distinct from old.issued_on and new.due_on is not distinct from old.due_on
     and new.valid_until is not distinct from old.valid_until and new.client_id = old.client_id
     and new.project_id is not distinct from old.project_id and new.payment_id is not distinct from old.payment_id
     and new.related_doc is not distinct from old.related_doc and new.milestone is not distinct from old.milestone
     and new.issued_at is not distinct from old.issued_at and new.created_at = old.created_at
     and length(trim(coalesce(new.cancel_reason, ''))) > 0 then
    -- A document money was paid against, or that a receipt or a credit note points at, is corrected with a credit
    -- note, never cancelled (README-BILLING section 3, rule 4).
    if exists (select 1 from public.crm_payments p where p.against_doc = old.id and p.status = 'recorded')
       or exists (select 1 from public.crm_documents x where x.related_doc = old.id and x.status = 'issued') then
      raise exception 'Money was received against this document, or a receipt or credit note points at it: correct it with a credit note.' using errcode = '42501';
    end if;
    new.cancelled_at := now();
    return new;
  end if;
  raise exception 'An issued document does not change. Cancel it with a reason and make a new one.' using errcode = '42501';
end $$;

drop trigger if exists crm_documents_guard on public.crm_documents;
create trigger crm_documents_guard before insert or update or delete on public.crm_documents
  for each row execute function private.crm_documents_guard();

create or replace function private.crm_payments_guard() returns trigger language plpgsql set search_path = '' as $$
declare
  v_kind    text;
  v_status  text;
  v_client  text;
  v_project text;
begin
  if tg_op = 'DELETE' then
    raise exception 'A payment is never deleted. Void it with a reason.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'recorded' or new.void_reason is not null then
      raise exception 'A payment is recorded first; voiding it later needs a reason.' using errcode = '42501';
    end if;
    -- Only against an issued proforma or invoice, of the same client and the same project.
    select d.kind, d.status, d.client_id, d.project_id into v_kind, v_status, v_client, v_project
      from public.crm_documents d where d.id = new.against_doc;
    if v_kind is null or v_status <> 'issued' or v_kind not in ('proforma', 'invoice') then
      raise exception 'A payment is recorded against an issued proforma or invoice.' using errcode = '23514';
    end if;
    if v_client <> new.client_id or v_project is distinct from new.project_id then
      raise exception 'A payment belongs to the client and project of its document.' using errcode = '23514';
    end if;
    new.created_at := now();
    return new;
  end if;
  -- UPDATE
  if old.status = 'voided' then
    raise exception 'A voided payment does not change.' using errcode = '42501';
  end if;
  -- What was credited, by whom, against what, never changes: not the amount, not the client, not the project.
  if new.id <> old.id or new.client_id <> old.client_id or new.project_id is distinct from old.project_id
     or new.against_doc <> old.against_doc or new.received_on <> old.received_on or new.amount <> old.amount
     or new.tds <> old.tds or new.mode <> old.mode or new.reference is distinct from old.reference
     or new.created_at <> old.created_at then
    raise exception 'A recorded payment does not change. Void it with a reason and record it again.' using errcode = '42501';
  end if;
  if new.status = 'voided' then
    if length(trim(coalesce(new.void_reason, ''))) = 0 then
      raise exception 'Voiding a payment needs a reason.' using errcode = '42501';
    end if;
    if exists (select 1 from public.crm_documents d where d.payment_id = old.id and d.status = 'issued') then
      raise exception 'Cancel the receipt for this payment first.' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.void_reason is distinct from old.void_reason then
    raise exception 'A recorded payment does not change. Void it with a reason and record it again.' using errcode = '42501';
  end if;
  return new;   -- only the note changed
end $$;

drop trigger if exists crm_payments_guard on public.crm_payments;
create trigger crm_payments_guard before insert or update or delete on public.crm_payments
  for each row execute function private.crm_payments_guard();

-- The timeline's time is the server's: an approval or a send cannot be back-dated through the API. A line
-- belongs to the client of its project: every screen reads a project's lines by the client, and a line filed under
-- one client with another client's project would sit in neither file where it belongs.
create or replace function private.crm_events_stamp() returns trigger language plpgsql set search_path = '' as $$
declare
  v_project_client text;
begin
  if new.project_id is not null then
    select p.client_id into v_project_client from public.crm_projects p where p.id = new.project_id;
    if v_project_client is distinct from new.client_id then
      raise exception 'A timeline line belongs to the client of its project.' using errcode = '23514';
    end if;
  end if;
  new.at := now();
  return new;
end $$;

drop trigger if exists crm_client_events_stamp on public.crm_client_events;
create trigger crm_client_events_stamp before insert on public.crm_client_events
  for each row execute function private.crm_events_stamp();

create or replace function private.crm_projects_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  -- A project stays with the client it was opened for: moved, its documents, payments and timeline would sit
  -- under another client's project, and that client's page and messages would show them.
  if tg_op = 'UPDATE' then
    if new.client_id is distinct from old.client_id then
      raise exception 'A project stays with the client it was opened for.' using errcode = '42501';
    end if;
    return new;
  end if;
  if exists (select 1 from public.crm_documents d where d.project_id = old.id and d.status <> 'draft')
     or exists (select 1 from public.crm_payments p where p.project_id = old.id) then
    raise exception 'This project has issued documents or payments: close it, never delete it.' using errcode = '42501';
  end if;
  return old;
end $$;

drop trigger if exists crm_projects_guard on public.crm_projects;
create trigger crm_projects_guard before update or delete on public.crm_projects
  for each row execute function private.crm_projects_guard();

drop trigger if exists crm_clients_touch on public.crm_clients;
create trigger crm_clients_touch before update on public.crm_clients for each row execute function private.crm_touch();
drop trigger if exists crm_projects_touch on public.crm_projects;
create trigger crm_projects_touch before update on public.crm_projects for each row execute function private.crm_touch();

-- ── 3. Issue: the next number in the series, consecutive, no gaps ──────────
create or replace function public.crm_issue_document(p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  d        public.crm_documents;
  v_series text;
  v_today  date := private.crm_ist_today();
  v_fy     text := private.crm_fy(private.crm_ist_today());
  v_first  integer;
  v_serial integer;
  v_number text;
  v_pay    public.crm_payments;
  v_rel    public.crm_documents;
  v_cn     bigint;
  v_part   text;
begin
  if not public.is_admin() then
    raise exception 'Only Mehdi issues documents.' using errcode = '42501';
  end if;
  select * into d from public.crm_documents where id = p_id for update;
  if not found then raise exception 'No such document.' using errcode = 'P0002'; end if;
  if d.status <> 'draft' then raise exception 'This document is already issued.' using errcode = '42501'; end if;

  v_series := case d.kind when 'quotation' then 'Q' when 'proforma' then 'PI' when 'invoice' then 'INV'
                          when 'receipt' then 'RC' when 'credit_note' then 'CN' end;

  if v_series is not null then
    if d.amount is null then raise exception 'A money document needs its amount.' using errcode = '22023'; end if;
    if d.amount <= 0 and d.kind <> 'invoice' then
      raise exception 'A money document asks for or acknowledges more than nothing.' using errcode = '22023';
    end if;
  end if;

  -- What a receipt and a credit note point at must be true before a number is spent on them.
  if d.kind = 'receipt' then
    select * into v_pay from public.crm_payments p where p.id = d.payment_id;
    if v_pay.id is null or v_pay.status <> 'recorded' or v_pay.client_id <> d.client_id
       or v_pay.amount <> d.amount or d.related_doc is distinct from v_pay.against_doc then
      raise exception 'A receipt is issued for one recorded payment, for the amount credited, against that payment''s document.' using errcode = '23514';
    end if;
  elsif d.kind = 'credit_note' then
    select * into v_rel from public.crm_documents x where x.id = d.related_doc;
    if v_rel.id is null or v_rel.status <> 'issued' or v_rel.client_id <> d.client_id
       or not (v_rel.kind = 'invoice' or (v_rel.kind = 'proforma' and d.data ->> 'reasonCode' = 'F')) then
      raise exception 'A credit note reduces one issued invoice of this client (or, refunding an advance, its proforma: code F).' using errcode = '23514';
    end if;
    select coalesce(sum(x.amount), 0) into v_cn from public.crm_documents x
     where x.kind = 'credit_note' and x.status = 'issued' and x.related_doc = v_rel.id;
    if v_cn + d.amount > v_rel.amount then
      raise exception 'The credit notes against % would come to more than it.', v_rel.number using errcode = '23514';
    end if;
    -- SOP-09 note 5: any refund, write-off or invoice discount needs both partners in writing.
    if length(trim(coalesce(d.data -> 'partnersApproval' ->> 'at', ''))) = 0
       or length(trim(coalesce(d.data -> 'partnersApproval' ->> 'channel', ''))) = 0 then
      raise exception 'A credit note needs both partners'' written yes recorded (date and channel).' using errcode = '23514';
    end if;
  elsif d.kind = 'proforma' and d.milestone in ('ADVANCE_50', 'CHANGE_REQUEST') then
    -- The advance is billed once (README-BILLING section 3): one issued proforma for the advance (or a split
    -- advance's part 1) and one for part 2 per project, part 2 only with a split advance, and one for each change
    -- request's advance. Without this a paid advance could be billed again under a new number, and the money
    -- register would show it as outstanding. A proforma refunded in full by credit notes (code F) no longer counts.
    -- The project row is locked first: two issues at the same moment wait for each other and cannot both pass.
    perform 1 from public.crm_projects p where p.id = d.project_id for update;
    if d.milestone = 'ADVANCE_50' then
      v_part := case when coalesce(d.data ->> 'part', '1') = '2' then '2' else '1' end;
      if v_part = '2' and coalesce(jsonb_typeof((select p.data -> 'splitAdvance' from public.crm_projects p where p.id = d.project_id)), 'null') <> 'object' then
        raise exception 'This project has no split advance: its advance is one proforma.' using errcode = '23514';
      end if;
    else
      v_part := 'CR:' || coalesce(d.data ->> 'crNo', '');
    end if;
    if exists (select 1 from public.crm_documents x
                where x.id <> d.id and x.kind = 'proforma' and x.milestone = d.milestone and x.status = 'issued'
                  and x.client_id = d.client_id and x.project_id is not distinct from d.project_id
                  and case when x.milestone = 'ADVANCE_50'
                           then case when coalesce(x.data ->> 'part', '1') = '2' then '2' else '1' end
                           else 'CR:' || coalesce(x.data ->> 'crNo', '') end = v_part
                  and coalesce(x.amount, 0) > coalesce((select sum(cn.amount) from public.crm_documents cn
                                                         where cn.kind = 'credit_note' and cn.status = 'issued' and cn.related_doc = x.id), 0)) then
      if d.milestone = 'ADVANCE_50' then
        raise exception 'This advance is already billed on an issued proforma: cancel that one with a reason, then issue the new one.' using errcode = '23505';
      else
        raise exception 'This change request''s advance is already billed on an issued proforma: cancel that one with a reason, then issue the new one.' using errcode = '23505';
      end if;
    end if;
  end if;

  if v_series is not null then
    -- the first serial of a series in a year may start above 1 (numbers Mehdi issued before the CRM)
    select coalesce(((s.data -> 'firstSerial' -> v_series) ->> v_fy)::int, 1) into v_first
      from public.crm_client_settings s where s.id = 'default';
    v_first := greatest(coalesce(v_first, 1), 1);
    insert into public.crm_doc_counters (series, fy, last_serial) values (v_series, v_fy, v_first - 1)
      on conflict (series, fy) do nothing;
    -- Issued and cancelled documents only: a draft never carries a serial (the guard), and never moves the count.
    update public.crm_doc_counters c
       set last_serial = greatest(c.last_serial,
                                  coalesce((select max(x.serial) from public.crm_documents x
                                             where x.series = v_series and x.fy = v_fy and x.status <> 'draft'), 0)) + 1
     where c.series = v_series and c.fy = v_fy
     returning c.last_serial into v_serial;
    v_number := 'IDV/' || case when v_series = 'INV' then '' else v_series || '/' end || v_fy || '/' || lpad(v_serial::text, 3, '0');
  end if;

  perform set_config('crm.issuing', d.id, true);
  update public.crm_documents set
    status      = 'issued',
    series      = v_series,
    fy          = case when v_series is null then null else v_fy end,
    serial      = v_serial,
    number      = v_number,
    issued_on   = v_today,
    due_on      = case when d.kind in ('proforma', 'invoice') then v_today + 7 else null end,
    valid_until = case when d.kind in ('quotation', 'proforma') then v_today + 15 else null end,
    issued_at   = now()
  where id = d.id
  returning * into d;
  perform set_config('crm.issuing', '', true);
  return to_jsonb(d);
end $$;

-- ── 4. Who may read and write: the owner only ───────────────────────────────
alter table public.crm_client_settings enable row level security;
alter table public.crm_clients enable row level security;
alter table public.crm_projects enable row level security;
alter table public.crm_documents enable row level security;
alter table public.crm_doc_counters enable row level security;
alter table public.crm_payments enable row level security;
alter table public.crm_client_events enable row level security;

revoke all on table public.crm_client_settings, public.crm_clients, public.crm_projects, public.crm_documents,
                    public.crm_doc_counters, public.crm_payments, public.crm_client_events from public, anon, authenticated;
revoke all on sequence public.crm_client_code_seq, public.crm_project_code_seq from public, anon, authenticated;
-- The timeline's own id sequence: inserting a line needs no grant on it, and before 30 Oct 2026 Supabase's
-- default privileges hand it to anon and every login.
revoke all on sequence public.crm_client_events_id_seq from public, anon, authenticated;
grant select, insert, update on table public.crm_client_settings, public.crm_clients, public.crm_projects to authenticated;
grant delete on table public.crm_clients, public.crm_projects to authenticated;
grant select, insert, update, delete on table public.crm_documents to authenticated;
grant select, insert, update on table public.crm_payments to authenticated;
grant select, insert on table public.crm_client_events to authenticated;
grant select on table public.crm_doc_counters to authenticated;
grant usage on sequence public.crm_client_code_seq, public.crm_project_code_seq to authenticated;

drop policy if exists "crm_client_settings owner" on public.crm_client_settings;
create policy "crm_client_settings owner" on public.crm_client_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "crm_clients owner" on public.crm_clients;
create policy "crm_clients owner" on public.crm_clients
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "crm_projects owner" on public.crm_projects;
create policy "crm_projects owner" on public.crm_projects
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "crm_documents owner" on public.crm_documents;
create policy "crm_documents owner" on public.crm_documents
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "crm_payments owner" on public.crm_payments;
create policy "crm_payments owner" on public.crm_payments
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "crm_client_events owner" on public.crm_client_events;
create policy "crm_client_events owner" on public.crm_client_events
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
drop policy if exists "crm_doc_counters owner" on public.crm_doc_counters;
create policy "crm_doc_counters owner" on public.crm_doc_counters
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on function public.crm_issue_document(text) from public, anon;
grant execute on function public.crm_issue_document(text) to authenticated;
revoke all on function private.crm_fy(date), private.crm_ist_today(), private.crm_touch(), private.crm_documents_guard(),
                       private.crm_payments_guard(), private.crm_projects_guard(), private.crm_events_stamp() from public;

notify pgrst, 'reload schema';
