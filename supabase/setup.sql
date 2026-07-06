-- =====================================================================
-- PANME SHOP — one-paste schema bootstrap
-- Open your Supabase project → SQL Editor → New query → paste this file
-- → Run. Safe to run more than once.
-- =====================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

do $$ begin
  create policy "Users can view own profile"
    on public.profiles for select
    to authenticated
    using (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can update own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can insert own profile"
    on public.profiles for insert
    to authenticated
    with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- ---------- roles (secure pattern) ----------
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

do $$ begin
  create policy "Users read own roles"
    on public.user_roles for select
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ---------- pan_reports (app-specific) ----------
create table if not exists public.pan_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pan_number text,
  full_name text,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.pan_reports to authenticated;
grant all on public.pan_reports to service_role;
alter table public.pan_reports enable row level security;

do $$ begin
  create policy "Owners read own reports" on public.pan_reports
    for select to authenticated using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Owners insert own reports" on public.pan_reports
    for insert to authenticated with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Owners update own reports" on public.pan_reports
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "Owners delete own reports" on public.pan_reports
    for delete to authenticated using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

-- ---------- auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists pan_reports_set_updated_at on public.pan_reports;
create trigger pan_reports_set_updated_at
  before update on public.pan_reports
  for each row execute function public.set_updated_at();

-- Done. You can now sign up from the app.