-- Comment notifications for Pet Feed post owners (run in Supabase SQL Editor).

create table if not exists public.pet_feed_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id text not null,
  actor_user_id text not null,
  post_id uuid not null references public.pet_feed_posts(id) on delete cascade,
  comment_id uuid not null references public.pet_feed_comments(id) on delete cascade,
  type text not null default 'post_comment'
    check (type in ('post_comment')),
  body_preview text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create unique index if not exists idx_pet_feed_notifications_comment_unique
  on public.pet_feed_notifications(comment_id);

create index if not exists idx_pet_feed_notifications_recipient_unread
  on public.pet_feed_notifications(recipient_user_id, created_at desc)
  where read_at is null;

create index if not exists idx_pet_feed_notifications_recipient_created
  on public.pet_feed_notifications(recipient_user_id, created_at desc);

alter table public.pet_feed_notifications enable row level security;

drop policy if exists "pet_feed_notifications_select_own" on public.pet_feed_notifications;
drop policy if exists "pet_feed_notifications_update_own" on public.pet_feed_notifications;

create policy "pet_feed_notifications_select_own"
on public.pet_feed_notifications for select
to authenticated
using (auth.uid()::text = recipient_user_id);

create policy "pet_feed_notifications_update_own"
on public.pet_feed_notifications for update
to authenticated
using (auth.uid()::text = recipient_user_id)
with check (auth.uid()::text = recipient_user_id);
