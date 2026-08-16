-- Support Hub tickets (feedback + scam) for admin inbox.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('feedback', 'scam')),
  category text,
  title text,
  body text not null default '',
  scam_target_type text,
  identifier text,
  related_url text,
  anonymous boolean not null default false,
  evidence_confirmed boolean not null default false,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_feedback_fields_check check (
    kind <> 'feedback'
    or (category is not null and title is not null)
  ),
  constraint support_tickets_scam_fields_check check (
    kind <> 'scam'
    or (scam_target_type is not null and identifier is not null)
  )
);

create index if not exists idx_support_tickets_status_created
  on public.support_tickets(status, created_at desc);

create index if not exists idx_support_tickets_kind_status_created
  on public.support_tickets(kind, status, created_at desc);

create index if not exists idx_support_tickets_user_created
  on public.support_tickets(user_id, created_at desc);

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
    'admin_feedback_open',
    'admin_scam_open',
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
