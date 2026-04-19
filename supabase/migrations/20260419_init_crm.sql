-- Extensions
create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text not null,
  phone text not null,
  email text,
  city text,
  segment text,
  status text not null default 'new',
  priority text not null default 'medium',
  potential_kzt numeric not null default 0,
  next_follow_up_date date,
  next_action text,
  notes text,
  product text,
  assigned_to text,
  sample_sent_date date,
  message_template text default 'first_followup',
  last_contact_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activities
create table if not exists public.client_activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'note',
  action text not null,
  result text,
  created_at timestamptz not null default now()
);

create index if not exists clients_owner_id_idx on public.clients(owner_id);
create index if not exists clients_next_follow_up_date_idx on public.clients(next_follow_up_date);
create index if not exists client_activities_owner_id_idx on public.client_activities(owner_id);
create index if not exists client_activities_client_id_idx on public.client_activities(client_id);

-- Keep updated_at fresh
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clients_set_updated_at on public.clients;
create trigger trg_clients_set_updated_at
before update on public.clients
for each row
execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_activities enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own"
on public.clients
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own"
on public.clients
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own"
on public.clients
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own"
on public.clients
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "activities_select_own" on public.client_activities;
create policy "activities_select_own"
on public.client_activities
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "activities_insert_own" on public.client_activities;
create policy "activities_insert_own"
on public.client_activities
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "activities_update_own" on public.client_activities;
create policy "activities_update_own"
on public.client_activities
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "activities_delete_own" on public.client_activities;
create policy "activities_delete_own"
on public.client_activities
for delete
to authenticated
using (owner_id = auth.uid());
