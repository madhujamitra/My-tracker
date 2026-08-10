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

-- ---------------------------------------------------------------------------
-- Applications module (job tracker)
-- ---------------------------------------------------------------------------

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role text,
  status text not null default 'applied'
    check (status in (
      'applied',
      'interviewing',
      'offer',
      'rejected',
      'not_selected',
      'withdrawn'
    )),
  applied_at date,
  last_activity_at timestamptz not null default now(),
  notes text,
  contact_linkedin text,
  contact_other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists applications_user_status_idx on public.applications (user_id, status);

alter table public.applications enable row level security;

drop policy if exists "Users can select own applications" on public.applications;
drop policy if exists "Users can insert own applications" on public.applications;
drop policy if exists "Users can update own applications" on public.applications;
drop policy if exists "Users can delete own applications" on public.applications;

create policy "Users can select own applications"
  on public.applications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own applications"
  on public.applications for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own applications"
  on public.applications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own applications"
  on public.applications for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.interview_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  title text not null,
  event_type text not null default 'interview'
    check (event_type in ('interview', 'call', 'linkedin', 'other')),
  starts_at timestamptz not null,
  link text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists interview_events_user_id_idx on public.interview_events (user_id);
create index if not exists interview_events_starts_at_idx on public.interview_events (user_id, starts_at);

alter table public.interview_events enable row level security;

drop policy if exists "Users can select own interview_events" on public.interview_events;
drop policy if exists "Users can insert own interview_events" on public.interview_events;
drop policy if exists "Users can update own interview_events" on public.interview_events;
drop policy if exists "Users can delete own interview_events" on public.interview_events;

create policy "Users can select own interview_events"
  on public.interview_events for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own interview_events"
  on public.interview_events for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own interview_events"
  on public.interview_events for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own interview_events"
  on public.interview_events for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Gmail sync (tokens are service-role only — no authenticated policies)
-- ---------------------------------------------------------------------------

create table if not exists public.gmail_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  last_history_id text,
  last_synced_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;
-- No policies for authenticated/anon: only service_role (Edge Functions) access tokens.

create table if not exists public.gmail_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gmail_message_id text not null,
  kind text not null
    check (kind in ('new_application', 'status_update', 'interview_event', 'needs_reply')),
  subject text,
  snippet text,
  from_email text,
  proposed_company text,
  proposed_role text,
  proposed_status text,
  proposed_starts_at timestamptz,
  proposed_title text,
  application_id uuid references public.applications (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'dismissed', 'applied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, gmail_message_id, kind)
);

-- If table already existed with older check constraints, widen them:
alter table public.gmail_proposals drop constraint if exists gmail_proposals_kind_check;
alter table public.gmail_proposals
  add constraint gmail_proposals_kind_check
  check (kind in ('new_application', 'status_update', 'interview_event', 'needs_reply'));

alter table public.gmail_proposals drop constraint if exists gmail_proposals_status_check;
alter table public.gmail_proposals
  add constraint gmail_proposals_status_check
  check (status in ('pending', 'accepted', 'dismissed', 'applied'));

create index if not exists gmail_proposals_user_pending_idx
  on public.gmail_proposals (user_id, status, created_at desc);

alter table public.gmail_proposals enable row level security;

drop policy if exists "Users can select own gmail_proposals" on public.gmail_proposals;
drop policy if exists "Users can update own gmail_proposals" on public.gmail_proposals;

create policy "Users can select own gmail_proposals"
  on public.gmail_proposals for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own gmail_proposals"
  on public.gmail_proposals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- Inserts/deletes: service_role via Edge Functions only.

-- ---------------------------------------------------------------------------
-- Inbox items waiting for your reply (from Gmail sync)
-- ---------------------------------------------------------------------------

create table if not exists public.mail_needs_reply (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  gmail_message_id text not null,
  subject text,
  snippet text,
  from_email text,
  received_at timestamptz,
  status text not null default 'open'
    check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  unique (user_id, gmail_message_id)
);

create index if not exists mail_needs_reply_user_open_idx
  on public.mail_needs_reply (user_id, status, created_at desc);

alter table public.mail_needs_reply enable row level security;

drop policy if exists "Users can select own mail_needs_reply" on public.mail_needs_reply;
drop policy if exists "Users can update own mail_needs_reply" on public.mail_needs_reply;

create policy "Users can select own mail_needs_reply"
  on public.mail_needs_reply for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own mail_needs_reply"
  on public.mail_needs_reply for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- Inserts: service_role via Edge Functions.
