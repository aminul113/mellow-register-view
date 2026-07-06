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
insert into public.admin_emails(email) values ('admin@panme.shop')
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
  _price numeric, _phone text, _whatsapp text, _email text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  update public.app_settings
    set search_price = coalesce(_price, search_price),
        support_phone = coalesce(_phone, support_phone),
        support_whatsapp = coalesce(_whatsapp, support_whatsapp),
        support_email = coalesce(_email, support_email),
        updated_at = now()
    where id = 1;
end $$;
grant execute on function public.admin_update_settings(numeric,text,text,text) to authenticated;

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

-- Done. Sign up with your ADMIN_EMAIL to become admin automatically.