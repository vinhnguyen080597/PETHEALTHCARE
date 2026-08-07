-- Breeder verification notifications + optional rejection payload on notifications.

-- Allow comment/post-less notification rows (breeder status events).
alter table public.pet_feed_notifications
  alter column post_id drop not null;

alter table public.pet_feed_notifications
  alter column comment_id drop not null;

alter table public.pet_feed_notifications
  add column if not exists breeder_profile_id uuid references public.breeder_profiles(id) on delete set null;

alter table public.pet_feed_notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Widen allowed notification types.
alter table public.pet_feed_notifications
  drop constraint if exists pet_feed_notifications_type_check;

alter table public.pet_feed_notifications
  add constraint pet_feed_notifications_type_check
  check (type in ('post_comment', 'breeder_verified', 'breeder_rejected'));

-- comment_id uniqueness should allow many NULL rows (breeder events).
drop index if exists public.idx_pet_feed_notifications_comment_unique;
create unique index if not exists idx_pet_feed_notifications_comment_unique
  on public.pet_feed_notifications(comment_id)
  where comment_id is not null;

create index if not exists idx_pet_feed_notifications_breeder_profile
  on public.pet_feed_notifications(breeder_profile_id)
  where breeder_profile_id is not null;
