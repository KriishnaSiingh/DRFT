-- ============================================================
-- DRFT QR Routing Manager — full schema
-- Paste this into your Supabase project SQL Editor and Run.
-- Safe to re-run (idempotent).
-- ============================================================

-- ---------- roles ----------
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

drop policy if exists "Users can read their own roles" on public.user_roles;
create policy "Users can read their own roles"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- ---------- cards ----------
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

grant select, insert, update on public.qr_cards to authenticated;
grant all on public.qr_cards to service_role;
-- anon needs NO direct table access — all public reads go through resolve_and_log_scan()

alter table public.qr_cards enable row level security;

drop policy if exists "Admins can read cards" on public.qr_cards;
create policy "Admins can read cards"
on public.qr_cards for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update cards" on public.qr_cards;
create policy "Admins can update cards"
on public.qr_cards for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert cards" on public.qr_cards;
create policy "Admins can insert cards"
on public.qr_cards for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

-- ---------- scans ----------
create table if not exists public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references public.qr_cards(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  device_type text not null default 'unknown',
  user_agent text
);

create index if not exists qr_scans_card_id_idx on public.qr_scans (card_id, scanned_at desc);

grant select, delete on public.qr_scans to authenticated;
grant all on public.qr_scans to service_role;

alter table public.qr_scans enable row level security;

drop policy if exists "Admins can read scans" on public.qr_scans;
create policy "Admins can read scans"
on public.qr_scans for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete scans" on public.qr_scans;
create policy "Admins can delete scans"
on public.qr_scans for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- ---------- resolve + log (callable by anon — no direct table access) ----------
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

  -- Return null if card doesn't exist, is inactive, or has no URL
  if v_url is null or v_status <> 'active' then
    return null;
  end if;

  insert into public.qr_scans (card_id, device_type, user_agent)
  values (p_card_id, coalesce(p_device_type, 'unknown'), left(coalesce(p_user_agent, ''), 500));

  update public.qr_cards
  set scan_count = scan_count + 1, last_scanned_at = now()
  where id = p_card_id;

  return v_url;
end;
$$;

-- anon CAN call this function (needed for QR scans without login)
grant execute on function public.resolve_and_log_scan(text, text, text) to anon, authenticated;

-- ---------- reset stats (admin only) ----------
create or replace function public.reset_card_stats(p_card_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  delete from public.qr_scans where card_id = p_card_id;
  update public.qr_cards
  set scan_count = 0, last_scanned_at = null, updated_at = now()
  where id = p_card_id;
end;
$$;

grant execute on function public.reset_card_stats(text) to authenticated;

-- ---------- updated_at trigger ----------
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

-- ---------- seed all 20 fixed cards ----------
insert into public.qr_cards (id, status)
select to_char(n, 'FM000'), 'inactive' from generate_series(1, 20) as n
on conflict (id) do nothing;

-- ============================================================
-- STEP 2: After signing up in the app, grant yourself admin.
-- Replace the email below with your actual email:
--
--   insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'you@example.com'
--   on conflict do nothing;
--
-- STEP 3: In the admin dashboard, click Edit on any card,
-- paste your Google Review URL, and toggle the card Active.
-- Cards 001-020 map to: https://drftreviews.vercel.app/q/001 ... /q/020
-- ============================================================
