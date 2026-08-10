-- Ensure deposit_hold / sold are allowed on pet_feed_posts.status (live DBs may predate this).

alter table public.pet_feed_posts drop constraint if exists pet_feed_posts_status_check;
alter table public.pet_feed_posts
  add constraint pet_feed_posts_status_check
  check (status in ('draft', 'pending_review', 'published', 'deposit_hold', 'archived', 'sold'));

-- Allow owner JWT updates through soft-deposit lifecycle (when service role is unavailable).
drop policy if exists "pet_feed_posts_update_own" on public.pet_feed_posts;
create policy "pet_feed_posts_update_own"
on public.pet_feed_posts for update
to authenticated
using (auth.uid()::text = user_id)
with check (
  auth.uid()::text = user_id
  and status in (
    'draft',
    'pending_review',
    'published',
    'deposit_hold',
    'archived',
    'sold'
  )
);
