create extension if not exists pgcrypto;

create table if not exists public.ai_message_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.crm_clients(id) on delete cascade,
  goal text not null,
  tone text not null,
  pressure text not null,
  length text not null,
  generated_text jsonb not null,
  was_used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_message_generations_owner
  on public.ai_message_generations (owner_id);

create index if not exists idx_ai_message_generations_client
  on public.ai_message_generations (client_id, created_at desc);

alter table public.ai_message_generations enable row level security;

drop policy if exists "ai_message_generations_select_own" on public.ai_message_generations;
create policy "ai_message_generations_select_own"
on public.ai_message_generations
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "ai_message_generations_insert_own" on public.ai_message_generations;
create policy "ai_message_generations_insert_own"
on public.ai_message_generations
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "ai_message_generations_update_own" on public.ai_message_generations;
create policy "ai_message_generations_update_own"
on public.ai_message_generations
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "ai_message_generations_delete_own" on public.ai_message_generations;
create policy "ai_message_generations_delete_own"
on public.ai_message_generations
for delete
to authenticated
using (owner_id = auth.uid());

