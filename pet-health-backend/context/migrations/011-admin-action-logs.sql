-- Admin moderation / ops action audit trail.

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id text null,
  actor_via_secret boolean not null default false,
  action text not null,
  target_type text not null,
  target_id text null,
  target_user_id text null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_admin_action_logs_created
  on public.admin_action_logs (created_at desc);

create index if not exists idx_admin_action_logs_action_created
  on public.admin_action_logs (action, created_at desc);

create index if not exists idx_admin_action_logs_actor_created
  on public.admin_action_logs (actor_user_id, created_at desc);

create index if not exists idx_admin_action_logs_target
  on public.admin_action_logs (target_type, target_id, created_at desc);

create index if not exists idx_admin_action_logs_target_user
  on public.admin_action_logs (target_user_id, created_at desc)
  where target_user_id is not null;

alter table public.admin_action_logs enable row level security;
