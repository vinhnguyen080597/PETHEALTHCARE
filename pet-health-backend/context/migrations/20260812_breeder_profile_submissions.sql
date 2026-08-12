-- Breeder transparency detail submissions (facility video, license, social links).

create table if not exists public.breeder_profile_submissions (
  id uuid primary key default gen_random_uuid(),
  breeder_profile_id uuid not null references public.breeder_profiles(id) on delete cascade,
  user_id text not null,
  submission_type text not null check (submission_type in (
    'facility_video',
    'business_license',
    'social_facebook',
    'social_zalo',
    'social_tiktok',
    'social_instagram'
  )),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason text not null default '',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_breeder_profile_submissions_status_created
  on public.breeder_profile_submissions(status, created_at desc);

create index if not exists idx_breeder_profile_submissions_user_status
  on public.breeder_profile_submissions(user_id, status);

create index if not exists idx_breeder_profile_submissions_profile_type
  on public.breeder_profile_submissions(breeder_profile_id, submission_type, status);

alter table public.breeder_profile_submissions enable row level security;

drop policy if exists "breeder_profile_submissions_select_own" on public.breeder_profile_submissions;
drop policy if exists "breeder_profile_submissions_insert_own" on public.breeder_profile_submissions;
drop policy if exists "breeder_profile_submissions_update_own" on public.breeder_profile_submissions;

create policy "breeder_profile_submissions_select_own"
on public.breeder_profile_submissions for select
to authenticated
using (auth.uid()::text = user_id);

create policy "breeder_profile_submissions_insert_own"
on public.breeder_profile_submissions for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "breeder_profile_submissions_update_own"
on public.breeder_profile_submissions for update
to authenticated
using (auth.uid()::text = user_id);

-- Admin notifications for transparency detail queue.
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
    'admin_breeder_pending',
    'admin_breeder_detail_pending',
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
