-- =====================================================================
-- PANME SHOP — one-paste schema bootstrap (safe to run multiple times)
-- Open your Supabase project → SQL Editor → New query → paste and Run.
-- =====================================================================

-- ---------- BUYER: set your admin email here (must match config.ts) ----
-- The first user who signs up with this email becomes admin automatically.
create table if not exists public.admin_emails (
  email text primary key
);
grant select on public.admin_emails to authenticated, anon;
grant all on public.admin_emails to service_role;
alter table public.admin_emails enable row level security;
do $$ begin
  create policy "admin_emails readable" on public.admin_emails
    for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;

-- >>>>> EDIT THIS EMAIL (must match config.ts ADMIN_EMAIL) <<<<<
insert into public.admin_emails(email) values ('admin@example.com')
  on conflict do nothing;


-- ---------- roles (must exist BEFORE any policy that calls has_role) ----
do $$ begin
  create type public.app_role as enum ('admin', 'moderator', 'user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

do $$ begin
  create policy "roles read own or admin" on public.user_roles for select
    to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;

-- ---------- profiles -----------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
do $$ begin
  create policy "profiles read own or admin" on public.profiles for select
    to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles update own" on public.profiles for update
    to authenticated using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles insert own" on public.profiles for insert
    to authenticated with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- ---------- app settings (singleton row id=1) ----------------------------
create table if not exists public.app_settings (
  id int primary key default 1,
  search_price numeric not null default 2,
  support_phone text default '',
  support_whatsapp text default '',
  support_email text default '',
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
alter table public.app_settings add column if not exists brand_name text not null default 'PANME SHOP';
alter table public.app_settings add column if not exists brand_tagline text not null default 'Find your PAN card instantly';
alter table public.app_settings add column if not exists logo_url text not null default '';
alter table public.app_settings add column if not exists favicon_url text not null default '';
grant select on public.app_settings to authenticated, anon;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
do $$ begin
  create policy "settings readable" on public.app_settings for select
    to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
insert into public.app_settings(id) values (1) on conflict do nothing;

-- ---------- wallets ------------------------------------------------------
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
grant select on public.wallets to authenticated;
grant all on public.wallets to service_role;
alter table public.wallets enable row level security;
do $$ begin
  create policy "wallets read own or admin" on public.wallets for select
    to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
-- No direct INSERT/UPDATE/DELETE policies: only SECURITY DEFINER RPCs may write.

-- ---------- wallet transactions -----------------------------------------
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('credit','debit','refund')),
  amount numeric not null check (amount > 0),
  note text,
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_user_created on public.wallet_transactions(user_id, created_at desc);
grant select on public.wallet_transactions to authenticated;
grant all on public.wallet_transactions to service_role;
alter table public.wallet_transactions enable row level security;
do $$ begin
  create policy "tx read own or admin" on public.wallet_transactions for select
    to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;

-- ---------- pan_searches (never store full Aadhaar) ---------------------
create table if not exists public.pan_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aadhaar_last4 text not null check (aadhaar_last4 ~ '^[0-9]{4}$'),
  status text not null default 'pending'
    check (status in ('pending','success','not_found','error','refunded')),
  pan_number text,
  full_name text,
  dob text,
  raw_response jsonb,
  cost numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pan_searches_user_created on public.pan_searches(user_id, created_at desc);
grant select on public.pan_searches to authenticated;
grant all on public.pan_searches to service_role;
alter table public.pan_searches enable row level security;
do $$ begin
  create policy "searches read own or admin" on public.pan_searches for select
    to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
-- writes only via SECURITY DEFINER RPCs

-- ---------- signup trigger: profile + wallet + admin grant --------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name, email) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.email
  ) on conflict (id) do nothing;

  insert into public.wallets(user_id) values (new.id) on conflict do nothing;

  insert into public.user_roles(user_id, role) values (new.id, 'user')
    on conflict do nothing;

  if exists (select 1 from public.admin_emails where lower(email) = lower(new.email)) then
    insert into public.user_roles(user_id, role) values (new.id, 'admin')
      on conflict do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- updated_at helpers ------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists pan_searches_set_updated_at on public.pan_searches;
create trigger pan_searches_set_updated_at before update on public.pan_searches
  for each row execute function public.set_updated_at();

drop trigger if exists wallets_set_updated_at on public.wallets;
create trigger wallets_set_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RPCs — the ONLY way the app can move money or write searches
-- =====================================================================

-- Debit wallet and create a pending search. Returns {search_id, cost}.
create or replace function public.debit_wallet_for_search(_aadhaar_last4 text)
returns table(search_id uuid, cost numeric)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _price numeric;
  _bal numeric;
  _sid uuid;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  if _aadhaar_last4 !~ '^[0-9]{4}$' then raise exception 'invalid aadhaar_last4'; end if;

  select search_price into _price from public.app_settings where id = 1;
  if _price is null then _price := 2; end if;

  -- lock wallet row
  select balance into _bal from public.wallets where user_id = _uid for update;
  if _bal is null then
    insert into public.wallets(user_id, balance) values (_uid, 0) on conflict do nothing;
    _bal := 0;
  end if;
  if _bal < _price then raise exception 'insufficient balance'; end if;

  update public.wallets set balance = balance - _price where user_id = _uid;

  insert into public.pan_searches(user_id, aadhaar_last4, status, cost)
    values (_uid, _aadhaar_last4, 'pending', _price)
    returning id into _sid;

  insert into public.wallet_transactions(user_id, type, amount, note, ref_id)
    values (_uid, 'debit', _price, 'PAN search', _sid);

  return query select _sid, _price;
end $$;
grant execute on function public.debit_wallet_for_search(text) to authenticated;

-- Finalize a search. Auto-refunds on 'not_found' or 'error'.
create or replace function public.finalize_search(
  _search_id uuid, _status text, _pan text, _name text, _dob text, _raw jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _owner uuid;
  _cost numeric;
  _cur_status text;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  if _status not in ('success','not_found','error') then raise exception 'bad status'; end if;

  select user_id, cost, status into _owner, _cost, _cur_status
    from public.pan_searches where id = _search_id for update;
  if _owner is null then raise exception 'search not found'; end if;
  if _owner <> _uid then raise exception 'forbidden'; end if;
  -- Idempotent: silent no-op if already finalized (prevents double refund on retries).
  if _cur_status <> 'pending' then return; end if;

  if _status = 'success' then
    update public.pan_searches set
      status = 'success', pan_number = _pan, full_name = _name, dob = _dob,
      raw_response = _raw
      where id = _search_id;
  else
    -- refund
    update public.wallets set balance = balance + _cost where user_id = _uid;
    insert into public.wallet_transactions(user_id, type, amount, note, ref_id)
      values (_uid, 'refund', _cost, 'PAN search refund ('||_status||')', _search_id);
    update public.pan_searches set
      status = case when _status = 'not_found' then 'not_found' else 'error' end,
      raw_response = _raw
      where id = _search_id;
  end if;
end $$;
grant execute on function public.finalize_search(uuid,text,text,text,text,jsonb) to authenticated;

-- Admin: force-refund a pending search (network partition safety net).
-- Idempotent: silently returns if the row is already finalized.
create or replace function public.admin_force_refund_search(_search_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  _owner uuid;
  _cost numeric;
  _cur_status text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;

  select user_id, cost, status into _owner, _cost, _cur_status
    from public.pan_searches where id = _search_id for update;
  if _owner is null then raise exception 'search not found'; end if;
  if _cur_status <> 'pending' then return; end if;

  update public.wallets set balance = balance + _cost where user_id = _owner;
  insert into public.wallet_transactions(user_id, type, amount, note, ref_id)
    values (_owner, 'refund', _cost, 'Admin force refund (stuck pending)', _search_id);
  update public.pan_searches set status = 'refunded' where id = _search_id;
end $$;
grant execute on function public.admin_force_refund_search(uuid) to authenticated;

-- Admin: credit any user's wallet
create or replace function public.admin_credit_wallet(_user_id uuid, _amount numeric, _note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _amount is null or _amount <= 0 then raise exception 'amount must be > 0'; end if;

  insert into public.wallets(user_id, balance) values (_user_id, 0) on conflict do nothing;
  update public.wallets set balance = balance + _amount where user_id = _user_id;
  insert into public.wallet_transactions(user_id, type, amount, note)
    values (_user_id, 'credit', _amount, coalesce(_note, 'Admin credit'));
end $$;
grant execute on function public.admin_credit_wallet(uuid,numeric,text) to authenticated;

-- Admin: update settings
create or replace function public.admin_update_settings(
  _price numeric, _phone text, _whatsapp text, _email text,
  _brand_name text default null, _brand_tagline text default null,
  _logo_url text default null, _favicon_url text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  update public.app_settings
    set search_price = coalesce(_price, search_price),
        support_phone = coalesce(_phone, support_phone),
        support_whatsapp = coalesce(_whatsapp, support_whatsapp),
        support_email = coalesce(_email, support_email),
        brand_name = coalesce(nullif(trim(_brand_name), ''), brand_name),
        brand_tagline = coalesce(_brand_tagline, brand_tagline),
        logo_url = coalesce(_logo_url, logo_url),
        favicon_url = coalesce(_favicon_url, favicon_url),
        updated_at = now()
    where id = 1;
end $$;
grant execute on function public.admin_update_settings(numeric,text,text,text,text,text,text,text) to authenticated;
-- drop old signature if it exists from previous installs
do $$ begin
  drop function if exists public.admin_update_settings(numeric,text,text,text);
exception when others then null; end $$;

-- Admin: find a user by email (returns id + name)
create or replace function public.admin_find_user(_email text)
returns table(user_id uuid, name text, email text, balance numeric)
language sql security definer set search_path = public as $$
  select
    u.id,
    coalesce(p.name, split_part(u.email,'@',1)) as name,
    u.email,
    coalesce(w.balance, 0) as balance
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.wallets   w on w.user_id = u.id
  where public.has_role(auth.uid(),'admin')
    and lower(u.email) = lower(trim(_email))
  limit 1
$$;
grant execute on function public.admin_find_user(text) to authenticated;

-- Admin: list/search users for manual wallet loading
create or replace function public.admin_list_users(_query text default '', _limit int default 50)
returns table(user_id uuid, name text, email text, balance numeric, created_at timestamptz)
language sql security definer set search_path = public as $$
  select
    u.id,
    coalesce(p.name, split_part(u.email,'@',1)) as name,
    u.email,
    coalesce(w.balance, 0) as balance,
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.wallets w on w.user_id = u.id
  where public.has_role(auth.uid(),'admin')
    and (
      coalesce(trim(_query), '') = ''
      or lower(u.email) like '%' || lower(trim(_query)) || '%'
      or lower(coalesce(p.name, '')) like '%' || lower(trim(_query)) || '%'
    )
  order by u.created_at desc
  limit least(greatest(coalesce(_limit, 50), 1), 100)
$$;
grant execute on function public.admin_list_users(text,int) to authenticated;

-- Backfill profiles/wallets for users that signed up before the trigger existed
insert into public.profiles(id, name, email)
select u.id,
       coalesce(u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
       u.email
from auth.users u
on conflict (id) do update set email = excluded.email;

insert into public.wallets(user_id)
select id from auth.users
on conflict do nothing;

-- ---------- self-heal: retro-grant admin role -------------------------------
-- If a buyer added their email to admin_emails AFTER signing up (very common
-- when deploying to Vercel/Netlify and forgetting to edit line 20 first), the
-- signup trigger has already run without granting admin. Re-running this SQL
-- fixes that: every existing auth user whose email is in admin_emails gets
-- the admin role. Idempotent — safe to run any number of times.
insert into public.user_roles(user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
join public.admin_emails a on lower(a.email) = lower(u.email)
on conflict (user_id, role) do nothing;

-- Done. Sign up with your ADMIN_EMAIL to become admin automatically.
-- Already signed up before adding your email? Just insert into admin_emails
-- and re-run this whole file — the block above will grant admin retroactively.

-- =====================================================================
-- Wallet top-up (payment gateway) — safe to re-run
-- =====================================================================
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  amount numeric not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending','success','failed')),
  provider_order_id text,
  utr text,
  raw jsonb,
  created_at timestamptz not null default now(),
  credited_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists payment_orders_user_created on public.payment_orders(user_id, created_at desc);
create index if not exists payment_orders_status on public.payment_orders(status);
grant select, update on public.payment_orders to authenticated;
grant all on public.payment_orders to service_role;
alter table public.payment_orders enable row level security;
do $$ begin
  create policy "payment_orders read own or admin" on public.payment_orders for select
    to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
exception when duplicate_object then null; end $$;
-- writes go through SECURITY DEFINER RPCs only; the UPDATE grant above is
-- narrowed by lack of an UPDATE policy — RLS blocks direct writes.

drop trigger if exists payment_orders_set_updated_at on public.payment_orders;
create trigger payment_orders_set_updated_at before update on public.payment_orders
  for each row execute function public.set_updated_at();

-- RPC: create a pending payment order for the caller. Server-generated order_id.
create or replace function public.create_payment_order(_amount numeric)
returns table(order_id text, amount numeric)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _oid text;
begin
  if _uid is null then raise exception 'not authenticated'; end if;
  if _amount is null or _amount <= 0 then raise exception 'amount must be > 0'; end if;
  _oid := 'W' || to_char(now(),'YYYYMMDDHH24MISS') || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.payment_orders(user_id, order_id, amount, status)
    values (_uid, _oid, _amount, 'pending');
  return query select _oid, _amount;
end $$;
grant execute on function public.create_payment_order(numeric) to authenticated;

-- RPC: idempotent credit on successful payment. Callable by the order owner
-- OR by an admin (service-role callback path).
create or replace function public.credit_wallet_for_payment(
  _order_id text, _utr text, _raw jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _owner uuid;
  _amount numeric;
  _status text;
begin
  select user_id, amount, status into _owner, _amount, _status
    from public.payment_orders where order_id = _order_id for update;
  if _owner is null then raise exception 'order not found'; end if;
  if _uid is not null and _uid <> _owner and not public.has_role(_uid,'admin') then
    raise exception 'forbidden';
  end if;
  if _status = 'success' then return; end if; -- idempotent
  if _status = 'failed' then
    -- allow late success: re-open by moving to success
    null;
  end if;

  insert into public.wallets(user_id, balance) values (_owner, 0) on conflict do nothing;
  update public.wallets set balance = balance + _amount where user_id = _owner;
  insert into public.wallet_transactions(user_id, type, amount, note)
    values (_owner, 'credit', _amount, 'Wallet top-up ('||coalesce(_utr,_order_id)||')');
  update public.payment_orders
    set status = 'success', utr = _utr, raw = _raw, credited_at = now()
    where order_id = _order_id;
end $$;
grant execute on function public.credit_wallet_for_payment(text,text,jsonb) to authenticated;

-- RPC: mark a payment failed (idempotent).
create or replace function public.mark_payment_failed(_order_id text, _raw jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _owner uuid;
  _status text;
begin
  select user_id, status into _owner, _status
    from public.payment_orders where order_id = _order_id for update;
  if _owner is null then raise exception 'order not found'; end if;
  if _uid is not null and _uid <> _owner and not public.has_role(_uid,'admin') then
    raise exception 'forbidden';
  end if;
  if _status <> 'pending' then return; end if;
  update public.payment_orders set status = 'failed', raw = _raw where order_id = _order_id;
end $$;
grant execute on function public.mark_payment_failed(text,jsonb) to authenticated;