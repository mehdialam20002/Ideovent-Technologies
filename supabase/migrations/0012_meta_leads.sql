-- ════════════════════════════════════════════════════════════════════════════
-- 0012: Meta Lead Ads. Leads from Ideovent's Facebook and Instagram instant
-- forms arrive in the CRM by themselves.
-- Written 2 October 2026. Needs 0011 (and through it 0004, 0005 and 0007).
-- Safe to run more than once, and safe to run ON ITS OWN on the live project:
-- paste only this file into Supabase > SQL Editor > New query > Run, after 0011.
-- ════════════════════════════════════════════════════════════════════════════
--
-- HOW A LEAD ARRIVES
--   Someone sends one of the instant forms. Meta POSTs a signed notification,
--   with ids only, to https://www.ideovent.in/api/meta/webhook. The function
--   checks Meta's signature, stores each lead id here at once
--   (meta_lead_receive: nothing is lost if what follows fails), reads the lead
--   from Meta's Graph API with its own token, and hands it to meta_lead_ingest,
--   which makes the CRM lead, once per Meta lead id. A daily catch-up
--   (api/meta/catchup.js) retries what failed and asks Meta for any lead whose
--   notification never came.
--
-- WHO MAY CALL WHAT
--   The webhook and the catch-up call with the PUBLIC anon key: this project has
--   no service_role key anywhere (api/_lib/supabaseRest.js says why). So every
--   function they call (the "token functions") first checks an INGEST TOKEN,
--   HMAC-SHA256(META_APP_SECRET, a fixed label), worked out in Vercel. This
--   database keeps only SHA-256 of it, stored by the owner's "Connect" (CRM >
--   Settings > Meta Lead Ads). The same for the Make.com relay (from
--   META_RELAY_SECRET), used only if Meta blocks the app. No secret, token or
--   password is kept here: a copy of this database signs and forges nothing.
--   The owner's three functions (Connect, the status, the settings) check
--   public.is_admin() first.
--
-- WHAT IS KEPT
--   The lead itself goes into public.outreach_leads under 0011's rules: a member
--   reads a Meta lead only when it is assigned to them. The three meta tables
--   hold Meta ids, times, outcomes and error codes, never a name, a number, an
--   e-mail or an answer, and only the owner reads them. A form that comes with
--   the number or e-mail of a lead already in the CRM never writes its answers
--   on that lead (whoever sent it may be someone else): they wait for Mehdi as
--   a request in public.crm_requests, which only he and admins read.
--
-- 0011'S FIELD GUARD trusts these functions (SECURITY DEFINER: current_user is
-- their owner, not an API role), so they check everything themselves: the keys
-- a Meta lead may set and their lengths, text only, the coded lists, a daily
-- cap, and one ingest at a time (an advisory lock).
--
-- No dynamic SQL anywhere in this file: what a stranger typed into a form only
-- ever travels as a value.
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.crm_members') is null
     or to_regprocedure('private.crm_duplicate_of(text,text,text,text)') is null then
    raise exception '0012 needs 0011: run supabase/migrations/0011_crm_team.sql first, then this file';
  end if;
end $$;


-- ── 1. Tables (no personal data in any of them) ─────────────────────────────

-- One row: the intake's settings. No secret: two SHA-256 fingerprints.
create table if not exists public.meta_settings (
  id              text primary key check (id = 'meta'),
  ingest_sha256   text check (ingest_sha256 ~ '^[0-9a-f]{64}$'),   -- SHA-256 of the webhook's ingest token (from META_APP_SECRET)
  relay_sha256    text check (relay_sha256 ~ '^[0-9a-f]{64}$'),    -- the same for the relay (META_RELAY_SECRET), when used
  page_id         text check (page_id ~ '^[0-9]{1,32}$'),
  page_name       text check (length(page_name) <= 200),
  token_info      jsonb not null default '{}'::jsonb check (jsonb_typeof(token_info) = 'object' and octet_length(token_info::text) <= 4000),
  forms           jsonb not null default '[]'::jsonb check (jsonb_typeof(forms) = 'array' and octet_length(forms::text) <= 20000),
  assign_mode     text not null default 'pool' check (assign_mode in ('pool', 'owner', 'rules')),
  daily_cap       integer not null default 300 check (daily_cap between 1 and 5000),
  connected_at    timestamptz,
  connected_by    text,
  last_catchup_at timestamptz,          -- the throttle
  last_poll_until timestamptz,          -- leads created after this are polled next time
  alerted         jsonb not null default '{}'::jsonb check (jsonb_typeof(alerted) = 'object'),   -- {"access"|"cap"|"page": last bell time}, one bell per topic per 12 hours
  updated_at      timestamptz not null default now()
);

-- One row per Meta lead id: the idempotency key and its state. Kept 120 days
-- (Meta deletes a lead after 90, so it cannot come back later).
create table if not exists public.meta_leads (
  leadgen_id   text primary key check (leadgen_id ~ '^[0-9]{1,32}$'),
  page_id      text check (page_id ~ '^[0-9]{1,32}$'),
  form_id      text check (form_id ~ '^[0-9]{1,32}$'),
  ad_id        text check (ad_id ~ '^[0-9]{1,32}$'),
  created_time timestamptz,                         -- when the person sent the form
  channel      text not null check (channel in ('webhook', 'catchup', 'relay')),
  status       text not null default 'pending' check (status in ('pending', 'created', 'duplicate', 'failed', 'gone')),
  error_kind   text check (error_kind in ('token', 'permission', 'transient', 'not_found', 'invalid')),
  last_error   text check (length(last_error) <= 300),
  attempts     integer not null default 0,
  crm_lead_id  text references public.outreach_leads (id) on delete set null,   -- deleting the lead keeps the id: it is never added again
  received_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  done_at      timestamptz
);
create index if not exists meta_leads_todo_idx on public.meta_leads (received_at) where status in ('pending', 'failed');
create index if not exists meta_leads_received_idx on public.meta_leads (received_at desc);
create index if not exists meta_leads_crm_lead_idx on public.meta_leads (crm_lead_id);

-- What happened, for Settings > Meta Lead Ads. Ids and outcomes only.
create table if not exists public.meta_ingest_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  channel     text not null check (channel in ('webhook', 'catchup', 'relay', 'connect', 'verify', 'owner')),
  event       text not null check (event in ('verified', 'received', 'other_page', 'created', 'duplicate', 'already',
                                             'failed', 'gone', 'over_cap', 'connected', 'catchup', 'settings')),
  leadgen_id  text check (leadgen_id ~ '^[0-9]{1,32}$'),
  form_id     text check (form_id ~ '^[0-9]{1,32}$'),
  ad_id       text check (ad_id ~ '^[0-9]{1,32}$'),
  crm_lead_id text check (length(crm_lead_id) <= 60),
  detail      text check (length(detail) <= 300)
);
create index if not exists meta_ingest_log_at_idx on public.meta_ingest_log (at desc);
create index if not exists meta_ingest_log_event_idx on public.meta_ingest_log (event, at desc);

-- Meta leads by Meta's id (a CSV import of an export, then the webhook, find each other).
create index if not exists outreach_leads_meta_lead_idx on public.outreach_leads ((data ->> 'metaLeadId')) where data ? 'metaLeadId';

-- The bell learns two kinds: "New lead" (lead_in) and "Lead Ads" (intake: the
-- intake needs Mehdi). 0011's inline check carries Postgres's own name for it.
-- Any OTHER check on "kind" (a renamed one) would still refuse the new kinds,
-- and dropping it would need dynamic SQL, which this file never uses: the file
-- stops and names it instead (nothing is changed; drop it, then run again).
alter table public.crm_notifications drop constraint if exists crm_notifications_kind_check;
do $$
declare
  v_name text;
begin
  select c.conname into v_name
    from pg_catalog.pg_constraint c
   where c.conrelid = 'public.crm_notifications'::regclass and c.contype = 'c'
     and pg_catalog.pg_get_constraintdef(c.oid) ~* '\mkind\M'
   order by c.conname
   limit 1;
  if v_name is not null then
    raise exception '0012: public.crm_notifications has another check on "kind" (%). Run: alter table public.crm_notifications drop constraint %; then run this file again.', v_name, v_name;
  end if;
end $$;
alter table public.crm_notifications add constraint crm_notifications_kind_check
  check (kind in ('assigned', 'moved_away', 'handoff', 'review', 'info', 'demo_ready', 'resolved', 'lead_in', 'intake'));

-- Mehdi's "Waiting on you" learns one kind of request: "meta_form", a Meta form
-- that came with the phone number or e-mail of a lead already in the CRM.
-- Whoever sent it may not be that lead (anyone can type a number into a form),
-- so its answers go to Mehdi alone, never onto the lead (review, 3 Oct; see
-- meta_lead_ingest). The owner and admins read requests; a member reads only
-- the ones she asked, and nobody asks this one. The check is replaced the same
-- way as the bell's above.
alter table public.crm_requests drop constraint if exists crm_requests_kind_check;
do $$
declare
  v_name text;
begin
  select c.conname into v_name
    from pg_catalog.pg_constraint c
   where c.conrelid = 'public.crm_requests'::regclass and c.contype = 'c'
     and pg_catalog.pg_get_constraintdef(c.oid) ~* '\mkind\M'
   order by c.conname
   limit 1;
  if v_name is not null then
    raise exception '0012: public.crm_requests has another check on "kind" (%). Run: alter table public.crm_requests drop constraint %; then run this file again.', v_name, v_name;
  end if;
end $$;
alter table public.crm_requests add constraint crm_requests_kind_check
  check (kind in ('demo', 'correction', 'question', 'handoff', 'give_back', 'meta_form'));


-- ── 2. Small helpers (schema private: not in the Data API) ──────────────────

-- The keys a Meta lead may set on a CRM lead, in this order: src/lib/meta/fields.js
-- META_LEAD_KEYS. scripts/test-meta-rls.mjs checks the two lists are equal.
create or replace function private.meta_lead_keys()
returns text[] language sql immutable security definer set search_path = '' as $$
  select array['instituteName', 'kind', 'contactName', 'phone', 'whatsapp', 'email', 'city', 'state', 'website',
               'source', 'notes', 'metaLeadId', 'metaPlatform', 'metaFormId', 'metaFormName', 'metaCampaignId',
               'metaCampaignName', 'metaAdsetId', 'metaAdsetName', 'metaAdId', 'metaAdName', 'metaCreatedAt',
               'metaOrganic', 'metaConsent']
$$;

-- The longest each key may be (fields.js META_MAX).
create or replace function private.meta_max(p_key text)
returns integer language sql immutable security definer set search_path = '' as $$
  select case p_key
    when 'instituteName' then 200 when 'kind' then 16 when 'contactName' then 120 when 'phone' then 40
    when 'whatsapp' then 40 when 'email' then 160 when 'city' then 80 when 'state' then 80
    when 'website' then 300 when 'source' then 40 when 'notes' then 3000 when 'metaLeadId' then 40
    when 'metaPlatform' then 16 when 'metaFormId' then 40 when 'metaFormName' then 200
    when 'metaCampaignId' then 40 when 'metaCampaignName' then 200 when 'metaAdsetId' then 40
    when 'metaAdsetName' then 200 when 'metaAdId' then 40 when 'metaAdName' then 200
    when 'metaCreatedAt' then 40 when 'metaOrganic' then 3 when 'metaConsent' then 4
  end
$$;

-- The only sources a Meta lead carries (fields.js META_SOURCES).
create or replace function private.meta_sources()
returns text[] language sql immutable security definer set search_path = '' as $$
  select array['Facebook Lead Ads', 'Instagram Lead Ads', 'Meta Lead Ads', 'Meta Leads Center']
$$;

-- "Instagram" for ig (fields.js platformLabel); "Meta" when unknown.
create or replace function private.meta_platform_label(p_code text)
returns text language sql immutable security definer set search_path = '' as $$
  select case p_code when 'fb' then 'Facebook' when 'ig' then 'Instagram' when 'msg' then 'Messenger'
                     when 'an' then 'Audience Network' when 'wa' then 'WhatsApp' else 'Meta' end
$$;

-- Midnight today in India (no daylight saving): the day every cap counts.
create or replace function private.meta_day_start()
returns timestamptz language sql stable security definer set search_path = '' as $$
  select (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata'
$$;

-- The one check every token function makes first. Raises 28000 unless SHA-256
-- of p_token is the stored fingerprint of the webhook's ingest token (or, with
-- p_allow_relay, of the relay's), and returns which matched: 'ingest' or
-- 'relay'. Hashes are compared, never tokens, and a token longer than 200
-- characters is refused without being hashed. One function, so the negative
-- test of scripts/test-meta-rls.mjs can switch it off in one place.
create or replace function private.meta_require_token(p_token text, p_allow_relay boolean default false)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_ingest text;
  v_relay  text;
  v_hash   text;
begin
  select s.ingest_sha256, s.relay_sha256 into v_ingest, v_relay from public.meta_settings s where s.id = 'meta';
  if v_ingest is null and v_relay is null then
    raise exception 'meta: the intake is not connected yet (press Connect in CRM > Settings > Meta Lead Ads)'
      using errcode = '28000';
  end if;
  if p_token is not null and length(p_token) <= 200 then
    v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
    if v_ingest is not null and v_hash = v_ingest then
      return 'ingest';
    end if;
    if coalesce(p_allow_relay, false) and v_relay is not null and v_hash = v_relay then
      return 'relay';
    end if;
  end if;
  raise exception 'meta: the ingest token does not match (a new App Secret? press Connect again)'
    using errcode = '28000';
end $$;

-- One line of the intake's log (Settings > Meta Lead Ads). Callers build
-- `detail` from ids, counts, the platform and Graph's codes, never from an
-- answer or a contact. At most 5,000 lines an India day besides "created", so a
-- flood of junk cannot fill the database.
create or replace function private.meta_log(p_channel text, p_event text, p_leadgen_id text default null,
                                            p_form_id text default null, p_ad_id text default null,
                                            p_crm_lead_id text default null, p_detail text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_event <> 'created'
     and (select count(*) from public.meta_ingest_log l
           where l.at >= private.meta_day_start() and l.event <> 'created') >= 5000 then
    return;
  end if;
  insert into public.meta_ingest_log (channel, event, leadgen_id, form_id, ad_id, crm_lead_id, detail)
  values (p_channel, p_event,
          case when p_leadgen_id ~ '^[0-9]{1,32}$' then p_leadgen_id end,
          case when p_form_id ~ '^[0-9]{1,32}$' then p_form_id end,
          case when p_ad_id ~ '^[0-9]{1,32}$' then p_ad_id end,
          left(p_crm_lead_id, 60),
          left(p_detail, 300));
end $$;

-- A bell for Mehdi ("Lead Ads": the intake needs him), at most one per topic
-- every 12 hours: access (the token, or Leads access), cap (today's limit is
-- reached), page (the Page id in Vercel is not the connected Page). One limiter
-- per topic, so a token alert in the morning cannot hide a cap alert in the
-- afternoon. Without an owner row in public.crm_members: no bell.
create or replace function private.meta_alert(p_topic text, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_host uuid := private.crm_default_host();
  v_n    integer;
begin
  if p_topic is null or p_topic not in ('access', 'cap', 'page') then
    raise exception 'meta: unknown alert topic' using errcode = '22023';
  end if;
  update public.meta_settings s
     set alerted = s.alerted || jsonb_build_object(p_topic, private.crm_iso(now()))
   where s.id = 'meta'
     and (private.crm_ts(s.alerted ->> p_topic) is null
          or private.crm_ts(s.alerted ->> p_topic) <= now() - interval '12 hours');
  get diagnostics v_n = row_count;
  if v_n > 0 and v_host is not null then
    insert into public.crm_notifications (member_id, kind, title)
    values (v_host, 'intake', left(p_text, 300));
  end if;
end $$;

-- New ids over today's cap. Nothing about them is stored: Meta keeps them and
-- sends them again (the cap delays, it never drops). One "over_cap" line a day,
-- whose count is kept up to date for the Meta page, and a "cap" bell.
create or replace function private.meta_over_cap(p_channel text, p_n integer, p_cap integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_id  bigint;
  v_was integer;
begin
  if coalesce(p_n, 0) <= 0 then
    return;
  end if;
  select l.id, coalesce((substring(l.detail from '^([0-9]{1,9}) '))::integer, 0) into v_id, v_was
    from public.meta_ingest_log l
   where l.event = 'over_cap' and l.at >= private.meta_day_start()
   order by l.at desc
   limit 1;
  if v_id is null then
    perform private.meta_log(p_channel, 'over_cap', null, null, null, null,
      format('%s new leads over today''s limit of %s (they wait at Meta and come again)', p_n, p_cap));
  else
    update public.meta_ingest_log
       set detail = format('%s new leads over today''s limit of %s (they wait at Meta and come again)', v_was + p_n, p_cap)
     where id = v_id;
  end if;
  perform private.meta_alert('cap', format('Lead Ads: today''s limit of %s new Meta leads is reached. The rest wait at Meta. Raise the limit in Settings > Meta Lead Ads if they are real.', p_cap));
end $$;

-- The assignment rules for ONE new lead: the inner loop of 0011's
-- public.crm_apply_rules (which refuses any caller but the owner or an admin,
-- so it cannot be called from here). Active rules by priority, then id; kind
-- empty or equal; city empty or contained, without case; the rotation from
-- next_index, skipping people switched off, at their New cap or at 1,000 open
-- leads; next_index moves on exactly as crm_apply_rules moves it.
-- scripts/test-meta-rls.mjs proves both pick the same people in the same order.
create or replace function private.meta_rule_pick(p_kind text, p_city text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_rule record;
  v_n    integer;
  v_cand uuid;
  i      integer;
begin
  for v_rule in
    select r.* from public.crm_assignment_rules r
     where r.active
       and (r.kind is null or r.kind = coalesce(p_kind, 'other'))
       and (r.city is null or position(lower(r.city) in lower(coalesce(p_city, ''))) > 0)
     order by r.priority, r.id
       for update
  loop
    v_n := cardinality(v_rule.member_ids);
    for i in 0 .. v_n - 1 loop
      v_cand := v_rule.member_ids[((v_rule.next_index + i) % v_n) + 1];
      if exists (select 1 from public.crm_members m
                  where m.id = v_cand and m.active
                    and (m.role <> 'member'
                         or (private.crm_new_count(m.id) < m.new_lead_cap
                             and private.crm_open_count(m.id) < 1000))) then
        update public.crm_assignment_rules set next_index = (v_rule.next_index + i + 1) % v_n where id = v_rule.id;
        return v_cand;
      end if;
    end loop;
  end loop;
  return null;
end $$;


-- ── 3. The token functions (the webhook, the catch-up, the relay) ───────────
-- Each is dropped by its exact signature and made again, so a re-run never
-- leaves two versions whose defaults make PostgREST's choice ambiguous.

-- Store the lead ids of one notification (or one page of the daily poll) at
-- once, before anything can fail. p_items: at most 1,000 objects
-- {leadgen_id, page_id, form_id, ad_id, created_time}, ids as text. p_page_id
-- is the server's META_PAGE_ID: when it is not the Page stored at Connect,
-- nothing is stored, Mehdi's bell says "press Connect", and pageMismatch comes
-- back (the caller answers 503 or stops). Items of another Page (or a signed
-- sample from the dashboard's Test button) are counted, not stored. New ids
-- past today's cap are counted, not stored (overCap: the caller must not
-- acknowledge them). Returns the ids to fetch from Meta: new ones, pending
-- ones, and failed ones a fix may have cured. On the webhook channel a failed
-- id comes back only after 10 untouched minutes and under 30 attempts, so a
-- replayed body or Meta's own retries cannot hammer Graph with a failing id.
drop function if exists public.meta_lead_receive(text, jsonb, text, text);
create function public.meta_lead_receive(p_token text, p_items jsonb, p_channel text default 'webhook',
                                         p_page_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s       public.meta_settings%rowtype;
  r       public.meta_leads%rowtype;
  v_item  jsonb;
  v_id    text;
  v_page  text;
  v_form  text;
  v_ad    text;
  v_today integer;
  v_fetch text[] := '{}';
  v_seen  text[] := '{}';
  v_new   integer := 0;
  v_known integer := 0;
  v_other integer := 0;
  v_over  integer := 0;
begin
  perform private.meta_require_token(p_token, false);
  if p_channel is null or p_channel not in ('webhook', 'catchup') then
    raise exception 'meta: p_channel must be webhook or catchup' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 1000 then
    raise exception 'meta: p_items must be a list of at most 1,000 items' using errcode = '22023';
  end if;
  select * into s from public.meta_settings where id = 'meta';
  if p_page_id is null or s.page_id is null or p_page_id <> s.page_id then
    perform private.meta_alert('page', 'Lead Ads: the Page id in Vercel (META_PAGE_ID) is not the Page you connected. Press Connect in Settings > Meta Lead Ads.');
    perform private.meta_log(p_channel, 'received', null, null, null, null,
      format('%s ids not stored: META_PAGE_ID is not the connected Page (press Connect)', jsonb_array_length(p_items)));
    return jsonb_build_object('fetch', '[]'::jsonb, 'new', 0, 'known', 0, 'otherPage', 0, 'overCap', 0,
                              'pageMismatch', true);
  end if;
  -- One at a time with every other Meta write, so the cap counts right.
  perform pg_advisory_xact_lock(hashtext('ideovent:meta-ingest'));
  select count(*) into v_today from public.meta_leads l where l.received_at >= private.meta_day_start();

  for v_item in select e.value from jsonb_array_elements(p_items) e loop
    if jsonb_typeof(v_item) <> 'object'
       or exists (select 1 from jsonb_object_keys(v_item) k
                   where k not in ('leadgen_id', 'page_id', 'form_id', 'ad_id', 'created_time'))
       or exists (select 1 from jsonb_each(v_item) x where jsonb_typeof(x.value) not in ('string', 'null')) then
      raise exception 'meta: each item is {leadgen_id, page_id, form_id, ad_id, created_time}, as text'
        using errcode = '22023';
    end if;
    v_id   := v_item ->> 'leadgen_id';
    v_page := nullif(v_item ->> 'page_id', '');
    v_form := nullif(v_item ->> 'form_id', '');
    v_ad   := nullif(v_item ->> 'ad_id', '');
    if v_id is null or v_id !~ '^[0-9]{1,32}$' or v_page !~ '^[0-9]{1,32}$'
       or v_form !~ '^[0-9]{1,32}$' or v_ad !~ '^[0-9]{1,32}$' then
      raise exception 'meta: ids must be digits' using errcode = '22023';
    end if;
    continue when v_id = any (v_seen);
    v_seen := v_seen || v_id;

    if v_page is null or v_page <> p_page_id then
      v_other := v_other + 1;
      continue;
    end if;

    select * into r from public.meta_leads l where l.leadgen_id = v_id;
    if found then
      v_known := v_known + 1;
      if r.status = 'pending'
         or (r.status = 'failed' and r.error_kind in ('token', 'permission', 'transient')
             and (p_channel = 'catchup'
                  or (r.attempts < 30 and r.updated_at <= now() - interval '10 minutes'))) then
        v_fetch := v_fetch || v_id;
      end if;
      continue;
    end if;

    if v_today >= s.daily_cap then
      v_over := v_over + 1;
      continue;
    end if;
    insert into public.meta_leads (leadgen_id, page_id, form_id, ad_id, created_time, channel, status)
    values (v_id, v_page, v_form, v_ad, private.crm_ts(v_item ->> 'created_time'), p_channel, 'pending')
    on conflict (leadgen_id) do nothing;
    v_today := v_today + 1;
    v_new   := v_new + 1;
    v_fetch := v_fetch || v_id;
  end loop;

  if v_other > 0 then
    perform private.meta_log(p_channel, 'other_page', null, null, null, null,
      format('%s ids for another Page, or a signed sample (the dashboard''s Test button): not stored', v_other));
  end if;
  if v_over > 0 then
    perform private.meta_over_cap(p_channel, v_over, s.daily_cap);
  end if;
  perform private.meta_log(p_channel, 'received', null, null, null, null,
    format('%s ids: %s new, %s known, %s to fetch, %s for another Page, %s over the cap',
           jsonb_array_length(p_items), v_new, v_known, coalesce(array_length(v_fetch, 1), 0), v_other, v_over));
  return jsonb_build_object('fetch', to_jsonb(v_fetch), 'new', v_new, 'known', v_known, 'otherPage', v_other,
                            'overCap', v_over, 'pageMismatch', false);
end $$;

-- One Meta lead, read from the Graph API (or relayed by Make), into the CRM.
-- p_lead is fields.js mapMetaLead(...).lead: only the 24 keys of
-- private.meta_lead_keys(), text only, each cut to private.meta_max(). Returns
-- {result: created | duplicate | already | over_cap, leadId, assignedTo}.
--   created    a new lead, ol_meta_<id>: New, due now, added by Mehdi, in the
--              Unassigned pool, Mehdi's or the rules' (Settings > Meta Lead Ads)
--   duplicate  the phone, WhatsApp or e-mail is already a lead's (0011's rule):
--              that lead gets a neutral history line (no answers), is due now
--              when open, and whoever works it is told; the answers go to
--              Mehdi alone, as a request ("Waiting on you"); at most 3 such
--              touches and 1 bell a lead a day
--   already    this Meta lead id was handled before, even if the lead was then
--              deleted (erasure stays erasure)
--   over_cap   a new id past today's cap: nothing stored (the relay answers 429)
drop function if exists public.meta_lead_ingest(text, text, jsonb, text, text);
create function public.meta_lead_ingest(p_token text, p_leadgen_id text, p_lead jsonb,
                                        p_channel text default 'webhook', p_page_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s          public.meta_settings%rowtype;
  r          public.meta_leads%rowtype;
  d          record;
  v_channel  text;
  v_lead_id  text := 'ol_meta_' || coalesce(p_leadgen_id, '');
  v_now      text := private.crm_iso(now());
  v_data     jsonb := '{}'::jsonb;
  v_key      text;
  v_val      jsonb;
  v_text     text;
  v_existing text;
  v_created  timestamptz;
  v_platform text;
  v_title    text;
  v_where    text;
  v_answers  text;
  v_match    text;
  v_touches  integer;
  v_open     boolean;
  v_host     uuid := private.crm_default_host();
  v_pick     uuid;
  v_to       uuid;
begin
  if private.meta_require_token(p_token, true) = 'relay' then
    v_channel := 'relay';
  elsif p_channel in ('webhook', 'catchup') then
    v_channel := p_channel;
  else
    raise exception 'meta: p_channel must be webhook or catchup' using errcode = '22023';
  end if;
  if p_leadgen_id is null or p_leadgen_id !~ '^[0-9]{1,32}$' then
    raise exception 'meta: p_leadgen_id must be digits' using errcode = '22023';
  end if;
  if p_lead is null or jsonb_typeof(p_lead) <> 'object' or octet_length(p_lead::text) > 16384 then
    raise exception 'meta: p_lead must be a JSON object of at most 16 KB' using errcode = '22023';
  end if;
  if p_page_id is not null and p_page_id !~ '^[0-9]{1,32}$' then
    raise exception 'meta: p_page_id must be digits' using errcode = '22023';
  end if;

  -- Meta ingests run one at a time (a few a day): two notifications for the
  -- same person cannot both make a lead.
  perform pg_advisory_xact_lock(hashtext('ideovent:meta-ingest'));
  select * into s from public.meta_settings where id = 'meta';

  -- The idempotency row. The relay reaches here without a receive: its new
  -- ids count against the cap too.
  select * into r from public.meta_leads l where l.leadgen_id = p_leadgen_id for update;
  if not found then
    if (select count(*) from public.meta_leads l where l.received_at >= private.meta_day_start()) >= s.daily_cap then
      perform private.meta_over_cap(v_channel, 1, s.daily_cap);
      return jsonb_build_object('result', 'over_cap');
    end if;
    insert into public.meta_leads (leadgen_id, page_id, form_id, ad_id, created_time, channel, status)
    values (p_leadgen_id, p_page_id,
            case when p_lead ->> 'metaFormId' ~ '^[0-9]{1,32}$' then p_lead ->> 'metaFormId' end,
            case when p_lead ->> 'metaAdId' ~ '^[0-9]{1,32}$' then p_lead ->> 'metaAdId' end,
            private.crm_ts(p_lead ->> 'metaCreatedAt'), v_channel, 'pending')
    returning * into r;
  end if;
  if r.status in ('created', 'duplicate', 'gone') then
    perform private.meta_log(v_channel, 'already', p_leadgen_id, r.form_id, r.ad_id, r.crm_lead_id,
                             'handled before: ' || r.status);
    return jsonb_build_object('result', 'already', 'leadId', r.crm_lead_id);
  end if;

  -- Already in the CRM under this Meta id (an import of Meta's own export).
  select l.id into v_existing from public.outreach_leads l
   where l.id = v_lead_id or (l.data ? 'metaLeadId' and l.data ->> 'metaLeadId' = p_leadgen_id)
   order by (l.id = v_lead_id) desc
   limit 1;
  if v_existing is not null then
    update public.meta_leads
       set status = 'created', crm_lead_id = v_existing, done_at = now(), updated_at = now(),
           error_kind = null, last_error = null
     where leadgen_id = p_leadgen_id;
    perform private.meta_log(v_channel, 'already', p_leadgen_id, r.form_id, r.ad_id, v_existing, 'already in the CRM');
    return jsonb_build_object('result', 'already', 'leadId', v_existing);
  end if;

  -- The lead's data: the known keys only, text only, trimmed and cut.
  for v_key in select unnest(private.meta_lead_keys()) loop
    v_val := p_lead -> v_key;
    continue when v_val is null or jsonb_typeof(v_val) <> 'string';
    v_text := left(btrim(v_val #>> '{}'), private.meta_max(v_key));
    continue when v_text = '';
    v_data := v_data || jsonb_build_object(v_key, v_text);
  end loop;
  if coalesce(v_data ->> 'kind', '') not in ('school', 'coaching', 'dental', 'other') then
    v_data := v_data || jsonb_build_object('kind', 'other');
  end if;
  if not coalesce((v_data ->> 'source') = any (private.meta_sources()), false) then
    v_data := v_data || jsonb_build_object('source', 'Meta Lead Ads');
  end if;
  foreach v_key in array array['metaFormId', 'metaCampaignId', 'metaAdsetId', 'metaAdId'] loop
    if (v_data ->> v_key) !~ '^[0-9]{1,32}$' then
      v_data := v_data - v_key;
    end if;
  end loop;
  if (v_data ->> 'metaPlatform') !~ '^[a-z_]{1,16}$' then
    v_data := v_data - 'metaPlatform';
  end if;
  if (v_data ->> 'metaOrganic') not in ('yes', 'no') then
    v_data := v_data - 'metaOrganic';
  end if;
  if (v_data ->> 'metaConsent') not in ('yes', 'no', 'none') then
    v_data := v_data - 'metaConsent';
  end if;
  v_created := private.crm_ts(v_data ->> 'metaCreatedAt');
  if v_created is null then
    v_data := v_data - 'metaCreatedAt';
  else
    v_data := v_data || jsonb_build_object('metaCreatedAt', private.crm_iso(v_created));
  end if;
  v_data := v_data || jsonb_build_object('metaLeadId', p_leadgen_id);
  if not (v_data ? 'metaFormId') and r.form_id is not null then
    v_data := v_data || jsonb_build_object('metaFormId', r.form_id);
  end if;
  if not (v_data ? 'metaAdId') and r.ad_id is not null then
    v_data := v_data || jsonb_build_object('metaAdId', r.ad_id);
  end if;
  if private.crm_blank(v_data -> 'instituteName') then
    v_data := v_data || jsonb_build_object('instituteName', 'Lead from Meta');
  end if;
  v_platform := private.meta_platform_label(v_data ->> 'metaPlatform');
  v_title    := v_data ->> 'instituteName';
  v_where    := concat_ws(', ',
                  case when v_data ? 'metaFormName' then format('form "%s"', v_data ->> 'metaFormName') end,
                  case when v_data ? 'metaCampaignName' then format('campaign "%s"', v_data ->> 'metaCampaignName') end);

  -- The same person (0011's rule: the last ten digits of a phone or WhatsApp
  -- number, an e-mail without case). Never a second lead. Anyone can type
  -- someone else's number into a form (review, 3 Oct), so whoever sent it may
  -- not be that lead: the lead gets a neutral line only, saying which of its
  -- contacts the form came with, and the answers (a stranger's name, e-mail or
  -- "call me on another number") go to Mehdi alone, as a request on his Today
  -- ("Waiting on you"; crm_requests, read by the owner and admins only). At
  -- most 3 Meta touches of one lead an India day (a lead made from Meta today
  -- is one) and 1 bell; later ones that day are logged only ("quiet") and
  -- change nothing on the lead.
  select * into d from private.crm_duplicate_of(v_data ->> 'phone', v_data ->> 'whatsapp', v_data ->> 'email', v_lead_id);
  if found then
    select count(*) into v_touches from public.meta_leads m
     where m.crm_lead_id = d.lead_id and m.status in ('created', 'duplicate')
       and m.done_at >= private.meta_day_start();
    if v_touches < 3 then
      v_open := private.crm_is_open(d.status);
      select case when private.crm_phone_key(l.data ->> 'phone')
                         in (private.crm_phone_key(v_data ->> 'phone'), private.crm_phone_key(v_data ->> 'whatsapp'))
                    or private.crm_phone_key(l.data ->> 'whatsapp')
                         in (private.crm_phone_key(v_data ->> 'phone'), private.crm_phone_key(v_data ->> 'whatsapp'))
                  then 'phone number' else 'e-mail' end
        into v_match
        from public.outreach_leads l where l.id = d.lead_id;
      if position(E'Answers:\n' in coalesce(v_data ->> 'notes', '')) > 0 then
        v_answers := substring(v_data ->> 'notes' from position(E'Answers:\n' in v_data ->> 'notes') + 9);
      end if;
      v_answers := nullif(btrim(replace(coalesce(v_answers, ''), E'\n', '; '), '; '), '');
      insert into public.outreach_events (id, lead_id, data, actor_id)
      values ('oe_meta_' || p_leadgen_id, d.lead_id,
              jsonb_build_object('type', 'note', 'at', v_now,
                'detail', format('Someone sent the %s lead form with this lead''s %s%s.%s', v_platform, v_match,
                                 case when v_where <> '' then ' (' || v_where || ')' else '' end,
                                 case when v_answers is not null then ' Their answers went to Mehdi.' else '' end)),
              null)
      on conflict (id) do nothing;
      if v_answers is not null then
        insert into public.crm_requests (lead_id, kind, asked_by, host_id, body)
        values (d.lead_id, 'meta_form', null, v_host,
                left(format('Sent on the %s form%s with this lead''s %s. Answers: %s', v_platform,
                            case when v_data ? 'metaFormName' then format(' "%s"', v_data ->> 'metaFormName') else '' end,
                            v_match, v_answers), 500));
      end if;
      if v_open then
        update public.outreach_leads l
           set data = l.data || jsonb_build_object('nextActionAt', v_now, 'updatedAt', v_now),
               updated_at = now()
         where l.id = d.lead_id;
      end if;
      if v_touches = 0 then
        v_to := case when v_open and d.assigned_to is not null
                           and exists (select 1 from public.crm_members m where m.id = d.assigned_to and m.active)
                     then d.assigned_to else v_host end;
        if v_to is not null then
          insert into public.crm_notifications (member_id, kind, title, lead_id)
          values (v_to, 'lead_in', left(format('%s: someone sent the %s form with this lead''s %s',
                                               d.institute_name, v_platform, v_match), 300), d.lead_id);
        end if;
      end if;
    end if;
    update public.meta_leads
       set status = 'duplicate', crm_lead_id = d.lead_id, done_at = now(), updated_at = now(),
           error_kind = null, last_error = null
     where leadgen_id = p_leadgen_id;
    perform private.meta_log(v_channel, 'duplicate', p_leadgen_id, r.form_id, r.ad_id, d.lead_id,
      case when v_touches < 3 then format('%s: the phone or e-mail of a lead already in the CRM', v_platform)
           else 'quiet: more than 3 today' end);
    return jsonb_build_object('result', 'duplicate', 'leadId', d.lead_id, 'assignedTo', d.assigned_to);
  end if;

  -- Who works it: the Unassigned pool (default), Mehdi, or the rules (no
  -- match: the pool). Someone who cannot take it (switched off, at their cap)
  -- leaves it in the pool.
  v_pick := case s.assign_mode
              when 'owner' then v_host
              when 'rules' then private.meta_rule_pick(v_data ->> 'kind', v_data ->> 'city')
            end;
  if v_pick is not null then
    begin
      perform private.crm_check_assignee(v_pick, 1, 1, 0);
    exception when others then
      v_pick := null;
    end;
  end if;

  -- The lead. Added by Mehdi (a lead with no creator would be taken over by a
  -- re-run of 0011's data migration). 0011's guard sees a trusted caller and
  -- only stamps assigned_at and closed_at; its audit line has no contacts.
  if v_created is null or v_created < now() - interval '90 days' or v_created > now() + interval '5 minutes' then
    v_created := now();
  end if;
  v_data := v_data || jsonb_build_object('id', v_lead_id, 'status', 'new', 'nextActionAt', v_now,
                                         'updatedAt', v_now, 'createdAt', private.crm_iso(v_created));
  insert into public.outreach_leads (id, data, updated_at, assigned_to, created_by)
  values (v_lead_id, v_data, now(), v_pick, v_host);

  -- Its first history line: written by nobody, so it claims no one's work.
  insert into public.outreach_events (id, lead_id, data, actor_id)
  values ('oe_meta_' || p_leadgen_id, v_lead_id,
          jsonb_build_object('type', 'note', 'at', v_now,
            'detail', format('New lead from the %s lead form%s%s.', v_platform,
                             case when v_data ? 'metaFormName' then format(' "%s"', v_data ->> 'metaFormName') else '' end,
                             case when v_data ? 'metaCampaignName'
                                  then format(' (campaign "%s")', v_data ->> 'metaCampaignName') else '' end)),
          null)
  on conflict (id) do nothing;

  if v_host is not null then
    insert into public.crm_notifications (member_id, kind, title, lead_id)
    values (v_host, 'lead_in', left(format('New lead from %s: %s', v_platform, v_title), 300), v_lead_id);
  end if;
  if v_pick is not null and v_pick is distinct from v_host then
    insert into public.crm_notifications (member_id, kind, title, lead_id)
    values (v_pick, 'assigned', left(format('New %s lead assigned to you: %s', v_platform, v_title), 300), v_lead_id);
  end if;

  update public.meta_leads
     set status = 'created', crm_lead_id = v_lead_id, done_at = now(), updated_at = now(),
         error_kind = null, last_error = null
   where leadgen_id = p_leadgen_id;
  perform private.meta_log(v_channel, 'created', p_leadgen_id, coalesce(v_data ->> 'metaFormId', r.form_id),
                           coalesce(v_data ->> 'metaAdId', r.ad_id), v_lead_id,
                           concat_ws(' · ', v_platform, v_data ->> 'metaFormName'));
  return jsonb_build_object('result', 'created', 'leadId', v_lead_id, 'assignedTo', v_pick);
end $$;

-- Meta did not give us a stored lead. transient: still pending (retried);
-- token, permission: failed, retried after Mehdi fixes access, and his bell
-- says so; invalid: failed, not retried; not_found: gone. Only a pending or
-- failed row changes: two deliveries of one id can run at once, and a late
-- failure from the slower one must never turn a created lead back into
-- "waiting" (after Mehdi deleted that lead, a retry would add it again and
-- undo his erasure).
drop function if exists public.meta_lead_failed(text, text, text, text);
create function public.meta_lead_failed(p_token text, p_leadgen_id text, p_kind text, p_detail text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r        public.meta_leads%rowtype;
  v_status text;
  v_detail text := left(regexp_replace(coalesce(p_detail, ''), 'EAA[A-Za-z0-9]{20,}', '[token]', 'g'), 300);
begin
  perform private.meta_require_token(p_token, false);
  if p_leadgen_id is null or p_leadgen_id !~ '^[0-9]{1,32}$' then
    raise exception 'meta: p_leadgen_id must be digits' using errcode = '22023';
  end if;
  if p_kind is null or p_kind not in ('token', 'permission', 'transient', 'not_found', 'invalid') then
    raise exception 'meta: p_kind must be token, permission, transient, not_found or invalid' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('ideovent:meta-ingest'));
  select * into r from public.meta_leads l where l.leadgen_id = p_leadgen_id for update;
  if not found then
    return jsonb_build_object('status', null, 'attempts', 0);
  end if;
  if r.status not in ('pending', 'failed') then
    return jsonb_build_object('status', r.status, 'attempts', r.attempts);
  end if;
  v_status := case p_kind when 'transient' then 'pending' when 'not_found' then 'gone' else 'failed' end;
  update public.meta_leads
     set status = v_status, attempts = r.attempts + 1, error_kind = p_kind, last_error = nullif(v_detail, ''),
         updated_at = now(), done_at = case when v_status = 'gone' then now() end
   where leadgen_id = p_leadgen_id;
  perform private.meta_log(r.channel, case when v_status = 'gone' then 'gone' else 'failed' end,
                           p_leadgen_id, r.form_id, r.ad_id, null,
                           p_kind || case when v_detail <> '' then ': ' || v_detail else '' end);
  if p_kind in ('token', 'permission') then
    perform private.meta_alert('access', 'Lead Ads needs you: Meta did not give us a new lead (the access token, or Leads access). Open Settings > Meta Lead Ads.');
  end if;
  return jsonb_build_object('status', v_status, 'attempts', r.attempts + 1);
end $$;

-- The ids worth asking Meta for again: pending, or failed for the token,
-- permission or a passing fault; under 30 attempts; untouched for 10 minutes
-- unless p_wait is false (the owner's "Fetch missed leads now", right after he
-- fixed the token); oldest first; at most 50. What still waits after 89 days
-- becomes gone: Meta keeps a lead 90 days.
drop function if exists public.meta_retry_due(text, integer, boolean);
create function public.meta_retry_due(p_token text, p_limit integer default 25, p_wait boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_gone integer;
  v_ids  jsonb;
begin
  perform private.meta_require_token(p_token, false);
  update public.meta_leads
     set status = 'gone', done_at = now(), updated_at = now(), last_error = 'older than Meta keeps leads'
   where status in ('pending', 'failed') and received_at < now() - interval '89 days';
  get diagnostics v_gone = row_count;
  if v_gone > 0 then
    perform private.meta_log('catchup', 'gone', null, null, null, null,
      format('%s ids older than Meta keeps leads (89 days): gone', v_gone));
  end if;
  select coalesce(jsonb_agg(x.leadgen_id order by x.received_at, x.leadgen_id), '[]'::jsonb) into v_ids
    from (select l.leadgen_id, l.received_at from public.meta_leads l
           where (l.status = 'pending' or (l.status = 'failed' and l.error_kind in ('token', 'permission', 'transient')))
             and l.attempts < 30
             and (not coalesce(p_wait, true) or l.updated_at <= now() - interval '10 minutes')
           order by l.received_at, l.leadgen_id
           limit least(greatest(coalesce(p_limit, 25), 1), 50)) x;
  return v_ids;
end $$;

-- The daily catch-up starts (the Vercel cron, or the owner's button: p_force).
-- The Page check first (a mismatch: the page bell, nothing else changes). Then
-- the throttle: 30 minutes, 1 when forced. Returns where the poll starts
-- (since: the last complete poll, or 3 days back the first time) and the ids
-- to retry.
drop function if exists public.meta_catchup_begin(text, boolean, text);
create function public.meta_catchup_begin(p_token text, p_force boolean default false, p_page_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s      public.meta_settings%rowtype;
  v_wait interval := case when coalesce(p_force, false) then interval '1 minute' else interval '30 minutes' end;
begin
  perform private.meta_require_token(p_token, false);
  select * into s from public.meta_settings where id = 'meta' for update;
  if p_page_id is null or s.page_id is null or p_page_id <> s.page_id then
    perform private.meta_alert('page', 'Lead Ads: the Page id in Vercel (META_PAGE_ID) is not the Page you connected. Press Connect in Settings > Meta Lead Ads.');
    return jsonb_build_object('ok', false, 'reason', 'page_mismatch');
  end if;
  if s.last_catchup_at is not null and s.last_catchup_at > now() - v_wait then
    return jsonb_build_object('ok', false, 'reason', 'too_soon', 'nextAt', private.crm_iso(s.last_catchup_at + v_wait));
  end if;
  update public.meta_settings set last_catchup_at = now(), updated_at = now() where id = 'meta';
  return jsonb_build_object('ok', true,
    'since', private.crm_iso(coalesce(s.last_poll_until, now() - interval '3 days')),
    'retry', public.meta_retry_due(p_token, 25, not coalesce(p_force, false)));
end $$;

-- The catch-up ends. p_until (the run's start) moves the poll window only when
-- the server read every form to its end, without a Graph error, over-cap ids
-- or a Page mismatch; otherwise it is null and the window stays, so a backlog
-- or a failed poll is read again next time. Never backwards. p_forms: the
-- forms seen ([{id, name, status}], at most 100). One log line, built only from
-- the whole numbers in p_stats. Old rows go: meta_leads after 120 days, the
-- log after 180, at most 5,000 of each per call (a statement run as anon must
-- end within Supabase's 3 seconds).
drop function if exists public.meta_catchup_end(text, timestamptz, jsonb, jsonb);
create function public.meta_catchup_end(p_token text, p_until timestamptz, p_forms jsonb default null,
                                        p_stats jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_forms jsonb := '[]'::jsonb;
  v_form  jsonb;
  v_line  text := '';
  e       record;
begin
  perform private.meta_require_token(p_token, false);
  if p_until is not null and p_until <= now() + interval '5 minutes' then
    update public.meta_settings
       set last_poll_until = p_until, updated_at = now()
     where id = 'meta' and (last_poll_until is null or last_poll_until < p_until);
  end if;
  if p_forms is not null and jsonb_typeof(p_forms) = 'array' then
    for v_form in select f.value from jsonb_array_elements(p_forms) f limit 100 loop
      continue when jsonb_typeof(v_form) <> 'object' or coalesce(v_form ->> 'id', '') !~ '^[0-9]{1,32}$';
      exit when octet_length(v_forms::text) > 18000;
      v_forms := v_forms || jsonb_build_array(jsonb_build_object(
        'id', v_form ->> 'id',
        'name', left(coalesce(v_form ->> 'name', ''), 120),
        'status', left(coalesce(v_form ->> 'status', ''), 20)));
    end loop;
    update public.meta_settings set forms = v_forms, updated_at = now() where id = 'meta';
  end if;
  if p_stats is not null and jsonb_typeof(p_stats) = 'object' and octet_length(p_stats::text) <= 2048 then
    for e in select k.key, k.value from jsonb_each(p_stats) k order by k.key loop
      continue when e.key !~ '^[a-zA-Z]{1,24}$' or jsonb_typeof(e.value) <> 'number'
                    or (e.value #>> '{}') !~ '^[0-9]{1,9}$';
      v_line := v_line || case when v_line = '' then '' else ', ' end || e.key || ' ' || (e.value #>> '{}');
    end loop;
  end if;
  perform private.meta_log('catchup', 'catchup', null, null, null, null,
    left(case when p_until is null then 'poll window kept (read again next time)' else 'poll window moved' end
         || case when v_line <> '' then ': ' || v_line else '' end, 300));
  delete from public.meta_leads l
   where l.leadgen_id in (select x.leadgen_id from public.meta_leads x
                           where x.received_at < now() - interval '120 days'
                           limit 5000);
  delete from public.meta_ingest_log l
   where l.id in (select x.id from public.meta_ingest_log x
                   where x.at < now() - interval '180 days'
                   limit 5000);
end $$;

-- Meta checked the webhook (its GET handshake). One line an hour at most.
drop function if exists public.meta_log_verified(text);
create function public.meta_log_verified(p_token text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.meta_require_token(p_token, false);
  if not exists (select 1 from public.meta_ingest_log l where l.event = 'verified' and l.at > now() - interval '1 hour') then
    perform private.meta_log('verify', 'verified', null, null, null, null, 'Meta checked the webhook (the verify handshake)');
  end if;
end $$;


-- ── 4. The owner's functions (CRM > Settings > Meta Lead Ads) ───────────────

-- "Connect": stores what api/_lib/metaConnect.js worked out on the server, AS THE
-- SIGNED-IN OWNER: the fingerprints (never a token or a secret), the Page, and
-- what the token check found (yes/no, dates, permission names).
drop function if exists public.meta_connect(text, text, text, text, jsonb);
create function public.meta_connect(p_ingest_sha256 text, p_relay_sha256 text, p_page_id text,
                                    p_page_name text default null, p_token_info jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_at timestamptz := now();
begin
  if not public.is_admin() then
    raise exception 'meta: only Mehdi connects Meta Lead Ads' using errcode = '42501';
  end if;
  if p_ingest_sha256 is null and p_relay_sha256 is null then
    raise exception 'meta: Connect needs at least one fingerprint' using errcode = '22023';
  end if;
  if p_ingest_sha256 !~ '^[0-9a-f]{64}$' or p_relay_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'meta: expected SHA-256 fingerprints in lower-case hex' using errcode = '22023';
  end if;
  if p_page_id is null or p_page_id !~ '^[0-9]{1,32}$' then
    raise exception 'meta: the Page id must be digits' using errcode = '22023';
  end if;
  if p_token_info is not null and (jsonb_typeof(p_token_info) <> 'object' or octet_length(p_token_info::text) > 4000) then
    raise exception 'meta: the token check must be a JSON object of at most 4 KB' using errcode = '22023';
  end if;
  insert into public.meta_settings (id, ingest_sha256, relay_sha256, page_id, page_name, token_info,
                                    connected_at, connected_by, updated_at)
  values ('meta', p_ingest_sha256, p_relay_sha256, p_page_id, left(btrim(p_page_name), 200),
          coalesce(p_token_info, '{}'::jsonb), v_at, left(auth.jwt() ->> 'email', 200), v_at)
  on conflict (id) do update
    set ingest_sha256 = excluded.ingest_sha256, relay_sha256 = excluded.relay_sha256,
        page_id = excluded.page_id, page_name = excluded.page_name, token_info = excluded.token_info,
        connected_at = excluded.connected_at, connected_by = excluded.connected_by, updated_at = excluded.updated_at;
  perform private.meta_log('connect', 'connected', null, null, null, null,
    concat_ws(' and ', case when p_ingest_sha256 is not null then 'webhook' end,
                       case when p_relay_sha256 is not null then 'relay' end) || ' connected');
  return jsonb_build_object('connectedAt', private.crm_iso(v_at));
end $$;

-- Everything the Meta page shows, in one call, for the owner. `current` says
-- the stored fingerprint is the one the server works out from today's App
-- Secret (false after a new secret: press Connect again). Reads only.
drop function if exists public.meta_intake_status(text, text);
create function public.meta_intake_status(p_ingest_sha256 text default null, p_relay_sha256 text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s         public.meta_settings%rowtype;
  v_day     timestamptz := private.meta_day_start();
  v_week    timestamptz := now() - interval '7 days';
  v_last_at timestamptz;
  v_last_id text;
  v_over    integer;
begin
  if not public.is_admin() then
    raise exception 'meta: only Mehdi sees the Meta Lead Ads settings' using errcode = '42501';
  end if;
  select * into s from public.meta_settings where id = 'meta';
  select l.at, l.crm_lead_id into v_last_at, v_last_id
    from public.meta_ingest_log l where l.event = 'created' order by l.at desc limit 1;
  select coalesce((substring(l.detail from '^([0-9]{1,9}) '))::integer, 0) into v_over
    from public.meta_ingest_log l where l.event = 'over_cap' and l.at >= v_day order by l.at desc limit 1;
  return jsonb_build_object(
    'connected',      coalesce(s.ingest_sha256 is not null or s.relay_sha256 is not null, false),
    'current',        coalesce(s.ingest_sha256 is not null and s.ingest_sha256 = lower(p_ingest_sha256), false),
    'relayConnected', coalesce(s.relay_sha256 is not null, false),
    'relayCurrent',   coalesce(s.relay_sha256 is not null and s.relay_sha256 = lower(p_relay_sha256), false),
    'connectedAt',    private.crm_iso(s.connected_at),
    'connectedBy',    s.connected_by,
    'pageId',         s.page_id,
    'pageName',       s.page_name,
    'tokenInfo',      coalesce(s.token_info, '{}'::jsonb),
    'forms',          coalesce(s.forms, '[]'::jsonb),
    'assignMode',     coalesce(s.assign_mode, 'pool'),
    'dailyCap',       coalesce(s.daily_cap, 300),
    'lastVerifiedAt', (select private.crm_iso(max(l.at)) from public.meta_ingest_log l where l.event = 'verified'),
    'lastTestAt',     (select private.crm_iso(max(l.at)) from public.meta_ingest_log l where l.event = 'other_page'),
    'lastReceivedAt', (select private.crm_iso(max(l.at)) from public.meta_ingest_log l where l.event = 'received'),
    'lastLeadAt',     private.crm_iso(v_last_at),
    'lastLeadId',     v_last_id,
    'lastCatchupAt',  private.crm_iso(s.last_catchup_at),
    'lastPollUntil',  private.crm_iso(s.last_poll_until),
    'alerts',         jsonb_build_object('access', s.alerted ->> 'access', 'cap', s.alerted ->> 'cap',
                                         'page', s.alerted ->> 'page'),
    'overCapToday',   coalesce(v_over, 0),
    'counts', jsonb_build_object(
      'today',            (select count(*) from public.meta_leads m where m.status = 'created' and m.done_at >= v_day),
      'week',             (select count(*) from public.meta_leads m where m.status = 'created' and m.done_at >= v_week),
      'duplicatesWeek',   (select count(*) from public.meta_leads m where m.status = 'duplicate' and m.done_at >= v_week),
      'duplicatesQuiet',  (select count(*) from public.meta_ingest_log l
                            where l.event = 'duplicate' and l.at >= v_week and l.detail like 'quiet:%'),
      'pending',          (select count(*) from public.meta_leads m where m.status = 'pending'),
      'failedToken',      (select count(*) from public.meta_leads m where m.status = 'failed' and m.error_kind = 'token'),
      'failedPermission', (select count(*) from public.meta_leads m where m.status = 'failed' and m.error_kind = 'permission'),
      'failedOther',      (select count(*) from public.meta_leads m
                            where m.status = 'failed' and m.error_kind is distinct from 'token'
                              and m.error_kind is distinct from 'permission'),
      'testLeadsSeen',    (select count(*) from public.meta_leads m where m.status = 'created' and m.ad_id is null)));
end $$;

-- Where new Meta leads go (pool, owner, rules) and the daily cap (1 to 5,000).
-- Null keeps a value. The owner only.
drop function if exists public.meta_set_settings(text, integer);
create function public.meta_set_settings(p_assign_mode text default null, p_daily_cap integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.meta_settings%rowtype;
begin
  if not public.is_admin() then
    raise exception 'meta: only Mehdi changes the Meta Lead Ads settings' using errcode = '42501';
  end if;
  if p_assign_mode is not null and p_assign_mode not in ('pool', 'owner', 'rules') then
    raise exception 'meta: new Meta leads go to the pool, the owner or the rules' using errcode = '22023';
  end if;
  if p_daily_cap is not null and (p_daily_cap < 1 or p_daily_cap > 5000) then
    raise exception 'meta: the daily limit is 1 to 5,000' using errcode = '22023';
  end if;
  insert into public.meta_settings (id) values ('meta') on conflict (id) do nothing;
  update public.meta_settings
     set assign_mode = coalesce(p_assign_mode, assign_mode), daily_cap = coalesce(p_daily_cap, daily_cap),
         updated_at = now()
   where id = 'meta'
  returning * into s;
  perform private.meta_log('owner', 'settings', null, null, null, null,
    format('new Meta leads go to: %s; at most %s a day', s.assign_mode, s.daily_cap));
  return jsonb_build_object('assignMode', s.assign_mode, 'dailyCap', s.daily_cap);
end $$;


-- ── 5. Who may read and call what ───────────────────────────────────────────
-- The meta tables: the owner reads meta_leads and meta_ingest_log; nobody
-- reads meta_settings directly (the owner reads it through
-- meta_intake_status). No insert, update or delete policy anywhere: rows come
-- only from the functions above.
alter table public.meta_settings   enable row level security;
alter table public.meta_leads      enable row level security;
alter table public.meta_ingest_log enable row level security;
revoke all on table public.meta_settings, public.meta_leads, public.meta_ingest_log from public, anon, authenticated;
grant select on table public.meta_leads, public.meta_ingest_log to authenticated;
grant all on table public.meta_settings, public.meta_leads, public.meta_ingest_log to service_role;   -- as 0011 does; unused here
drop policy if exists "meta leads select owner" on public.meta_leads;
create policy "meta leads select owner" on public.meta_leads
  for select to authenticated
  using ((select public.is_admin()));
drop policy if exists "meta log select owner" on public.meta_ingest_log;
create policy "meta log select owner" on public.meta_ingest_log
  for select to authenticated
  using ((select public.is_admin()));
-- public.meta_settings: RLS on and NO policy, like 0010's payment_settings.

-- Postgres lets PUBLIC run every new function and Supabase grants them to anon
-- and authenticated by name (0010's note): take it all back, then give exactly
-- this. The seven token functions: anon only (the server calls them with the
-- anon key and no session; the token is the check; a signed-in member is
-- refused for want of the grant, and would be by the token anyway). The
-- owner's three: authenticated, and each checks public.is_admin() first.
-- The Security Advisor lists the anon ones (lints 0028/0029), as it lists
-- 0010's record_payment_event: expected, each checks the ingest token first.
revoke all on function
  public.meta_lead_receive(text, jsonb, text, text), public.meta_lead_ingest(text, text, jsonb, text, text),
  public.meta_lead_failed(text, text, text, text), public.meta_retry_due(text, integer, boolean),
  public.meta_catchup_begin(text, boolean, text), public.meta_catchup_end(text, timestamptz, jsonb, jsonb),
  public.meta_log_verified(text),
  public.meta_connect(text, text, text, text, jsonb), public.meta_intake_status(text, text),
  public.meta_set_settings(text, integer)
  from public, anon, authenticated;
grant execute on function
  public.meta_lead_receive(text, jsonb, text, text), public.meta_lead_ingest(text, text, jsonb, text, text),
  public.meta_lead_failed(text, text, text, text), public.meta_retry_due(text, integer, boolean),
  public.meta_catchup_begin(text, boolean, text), public.meta_catchup_end(text, timestamptz, jsonb, jsonb),
  public.meta_log_verified(text)
  to anon, service_role;
grant execute on function
  public.meta_connect(text, text, text, text, jsonb), public.meta_intake_status(text, text),
  public.meta_set_settings(text, integer)
  to authenticated, service_role;
-- The helpers run only inside the functions above, as their owner.
revoke all on function
  private.meta_lead_keys(), private.meta_max(text), private.meta_sources(), private.meta_platform_label(text),
  private.meta_day_start(), private.meta_require_token(text, boolean), private.meta_log(text, text, text, text, text, text, text),
  private.meta_alert(text, text), private.meta_over_cap(text, integer, integer), private.meta_rule_pick(text, text)
  from public, anon, authenticated;


-- Verification, as a signed-out visitor. The two selects must fail with
-- "permission denied", the ingest must fail ("not connected yet" or "does not
-- match") and write nothing, and Connect must be refused outright:
--
--   set role anon;
--   select count(*) from public.meta_leads;            -- permission denied
--   select count(*) from public.meta_ingest_log;       -- permission denied
--   select public.meta_lead_ingest('forged', '123', '{"instituteName":"x"}'::jsonb);   -- 28000, nothing written
--   select public.meta_connect(repeat('0', 64), null, '1', 'x', '{}'::jsonb);         -- permission denied (no grant)
--   reset role;
--
-- The full check, on a copy of the rules: scripts/test-meta-rls.mjs (PGlite).

notify pgrst, 'reload schema';
