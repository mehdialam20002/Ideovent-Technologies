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
