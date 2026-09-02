-- =============================================================================
-- DRFT QR ROUTING MANAGER — COMPLETE SUPABASE DATABASE SCHEMA
-- =============================================================================
-- Instructions:
-- 1. Open your Supabase project (https://supabase.com/dashboard)
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query", paste this entire script, and click "Run"
-- Safe to re-run anytime (idempotent).
-- =============================================================================

-- 1. Create QR Cards table (20 fixed physical cards: '001' to '020')
create table if not exists public.qr_cards (
  id text primary key check (id ~ '^0(0[1-9]|1[0-9]|20)$'),
  shop_name text,
  destination_url text,
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Permissions
grant all on public.qr_cards to authenticated;
grant all on public.qr_cards to service_role;
grant select on public.qr_cards to anon;

alter table public.qr_cards enable row level security;

-- Policies for qr_cards
drop policy if exists "Allow authenticated full access to cards" on public.qr_cards;
create policy "Allow authenticated full access to cards"
  on public.qr_cards
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Allow anon read active cards" on public.qr_cards;
create policy "Allow anon read active cards"
  on public.qr_cards
  for select
  to anon
  using (status = 'active');


-- 2. Create QR Scans table (logs every scan event)
create table if not exists public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references public.qr_cards(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  device_type text not null default 'unknown',
  user_agent text
);

create index if not exists qr_scans_card_id_idx on public.qr_scans (card_id, scanned_at desc);

grant all on public.qr_scans to authenticated;
grant all on public.qr_scans to service_role;

alter table public.qr_scans enable row level security;

drop policy if exists "Allow authenticated read scans" on public.qr_scans;
create policy "Allow authenticated read scans"
  on public.qr_scans
  for select
  to authenticated
  using (true);

drop policy if exists "Allow authenticated delete scans" on public.qr_scans;
create policy "Allow authenticated delete scans"
  on public.qr_scans
  for delete
  to authenticated
  using (true);


-- 3. Scan resolution RPC (called whenever a physical QR code is scanned)
create or replace function public.resolve_and_log_scan(
  p_card_id text,
  p_device_type text default 'unknown',
  p_user_agent text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_status text;
begin
  select destination_url, status into v_url, v_status
  from public.qr_cards where id = p_card_id;

  -- If card not found, has no destination, or is inactive, return null
  if v_url is null or v_status <> 'active' then
    return null;
  end if;

  -- Record scan in audit log
  insert into public.qr_scans (card_id, device_type, user_agent)
  values (p_card_id, coalesce(p_device_type, 'unknown'), left(coalesce(p_user_agent, ''), 500));

  -- Increment scan count
  update public.qr_cards
  set scan_count = scan_count + 1, last_scanned_at = now()
  where id = p_card_id;

  return v_url;
end;
$$;

grant execute on function public.resolve_and_log_scan(text, text, text) to anon, authenticated;


-- 4. Reset stats RPC (called by admin to reset card stats)
create or replace function public.reset_card_stats(p_card_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.qr_scans where card_id = p_card_id;
  update public.qr_cards
  set scan_count = 0, last_scanned_at = null, updated_at = now()
  where id = p_card_id;
end;
$$;

grant execute on function public.reset_card_stats(text) to authenticated;


-- 5. Updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists qr_cards_touch_updated_at on public.qr_cards;
create trigger qr_cards_touch_updated_at
before update on public.qr_cards
for each row execute function public.touch_updated_at();


-- 6. PRE-SEED CARDS:
-- Pre-seed Card 001 & Card 002 with Google Reviews and set to active:
insert into public.qr_cards (id, shop_name, destination_url, status)
values
  ('001', 'DRFT Reviews — Location 1', 'https://search.google.com/local/writereview?placeid=ChIJK7BfLrErCTkRvBd4rfs6X8g', 'active'),
  ('002', 'DRFT Reviews — Location 2', 'https://search.google.com/local/writereview?placeid=ChIJUStYgL7pDDkRW8zAWxQ3Rhc', 'active')
on conflict (id) do update set
  destination_url = excluded.destination_url,
  status = excluded.status,
  shop_name = coalesce(public.qr_cards.shop_name, excluded.shop_name);

-- Pre-seed remaining Cards 003 to 020 as inactive:
insert into public.qr_cards (id, status)
select to_char(n, 'FM000'), 'inactive' from generate_series(3, 20) as n
on conflict (id) do nothing;
