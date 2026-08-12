-- Transparency score low-point warnings (≤15 after penalty).

create table if not exists public.transparency_warnings (
  id uuid primary key default gen_random_uuid(),
  breeder_profile_id uuid not null references public.breeder_profiles(id) on delete cascade,
  user_id text not null,
  score_at_trigger integer not null default 0,
  penalty_points_at_trigger integer not null default 0,
  trigger_violation_id text not null default '',
  status text not null default 'pending_breeder_action'
    check (status in (
      'pending_breeder_action',
      'confirmed',
      'appealed',
      'upheld',
      'restored'
    )),
  breeder_action_at timestamptz,
  admin_resolution text not null default '',
  admin_note text not null default '',
  admin_resolved_at timestamptz,
  admin_resolved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transparency_warnings_user_status
  on public.transparency_warnings(user_id, status);

create index if not exists idx_transparency_warnings_status_created
  on public.transparency_warnings(status, created_at desc);

create index if not exists idx_transparency_warnings_profile
  on public.transparency_warnings(breeder_profile_id, created_at desc);

-- At most one open warning per breeder (pending action or under appeal).
create unique index if not exists idx_transparency_warnings_one_open
  on public.transparency_warnings(breeder_profile_id)
  where status in ('pending_breeder_action', 'appealed');

alter table public.transparency_warnings enable row level security;

drop policy if exists "transparency_warnings_select_own" on public.transparency_warnings;
drop policy if exists "transparency_warnings_update_own" on public.transparency_warnings;

create policy "transparency_warnings_select_own"
on public.transparency_warnings for select
to authenticated
using (auth.uid()::text = user_id);

create policy "transparency_warnings_update_own"
on public.transparency_warnings for update
to authenticated
using (auth.uid()::text = user_id);

-- Notification types for warning + appeal inbox.
alter table public.pet_feed_notifications
  drop constraint if exists pet_feed_notifications_type_check;

alter table public.pet_feed_notifications
  add constraint pet_feed_notifications_type_check
  check (type in (
    'post_comment',
    'breeder_verified',
    'breeder_rejected',
    'breeder_detail_approved',
    'breeder_detail_rejected',
    'transparency_warning',
    'transparency_warning_resolved',
    'admin_breeder_pending',
    'admin_breeder_detail_pending',
    'admin_transparency_appeal',
    'admin_listing_pending',
    'admin_report_open',
    'deposit_request',
    'deposit_confirmed',
    'deposit_cancel_request',
    'deposit_cancelled',
    'deal_complete_request',
    'deal_completed',
    'deal_dispute_opened',
    'deal_dispute_resolved',
    'listing_approved',
    'listing_rejected',
    'conversation_message'
  ));
