-- Run this once in Supabase → SQL Editor → New query → Run
-- Per-user workspace JSON (sheet + meta + timers)

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sheet_data jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  timers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Users can select own app_state" on public.app_state;
drop policy if exists "Users can insert own app_state" on public.app_state;
drop policy if exists "Users can update own app_state" on public.app_state;
drop policy if exists "Users can delete own app_state" on public.app_state;

create policy "Users can select own app_state"
  on public.app_state for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own app_state"
  on public.app_state for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own app_state"
  on public.app_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own app_state"
  on public.app_state for delete
  to authenticated
  using (auth.uid() = user_id);
