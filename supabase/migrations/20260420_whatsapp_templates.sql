create extension if not exists pgcrypto;

create table if not exists public.crm_whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_whatsapp_templates_owner
  on public.crm_whatsapp_templates (owner_id);

create index if not exists idx_crm_whatsapp_templates_owner_category
  on public.crm_whatsapp_templates (owner_id, category);

create index if not exists idx_crm_whatsapp_templates_owner_active
  on public.crm_whatsapp_templates (owner_id, is_active);

create index if not exists idx_crm_whatsapp_templates_updated
  on public.crm_whatsapp_templates (updated_at desc);

create or replace function public.crm_handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_crm_whatsapp_templates_set_updated_at on public.crm_whatsapp_templates;
create trigger trg_crm_whatsapp_templates_set_updated_at
before update on public.crm_whatsapp_templates
for each row execute function public.crm_handle_updated_at();

alter table public.crm_whatsapp_templates enable row level security;

drop policy if exists "crm_whatsapp_templates_select_own" on public.crm_whatsapp_templates;
create policy "crm_whatsapp_templates_select_own"
on public.crm_whatsapp_templates
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "crm_whatsapp_templates_insert_own" on public.crm_whatsapp_templates;
create policy "crm_whatsapp_templates_insert_own"
on public.crm_whatsapp_templates
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "crm_whatsapp_templates_update_own" on public.crm_whatsapp_templates;
create policy "crm_whatsapp_templates_update_own"
on public.crm_whatsapp_templates
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "crm_whatsapp_templates_delete_own" on public.crm_whatsapp_templates;
create policy "crm_whatsapp_templates_delete_own"
on public.crm_whatsapp_templates
for delete
to authenticated
using (owner_id = auth.uid());

