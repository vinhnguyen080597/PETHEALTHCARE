-- Allow cancelled (negative close) alongside sold (positive close).

alter table public.pet_feed_posts drop constraint if exists pet_feed_posts_status_check;
alter table public.pet_feed_posts
  add constraint pet_feed_posts_status_check
  check (status in ('draft', 'pending_review', 'published', 'deposit_hold', 'archived', 'sold', 'cancelled'));

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
    'sold',
    'cancelled'
  )
);

drop policy if exists "pet_feed_comments_select_visible" on public.pet_feed_comments;
create policy "pet_feed_comments_select_visible"
on public.pet_feed_comments for select
to authenticated
using (
  exists (
    select 1 from public.pet_feed_posts p
    where p.id = post_id
      and (
        p.status in ('published', 'deposit_hold', 'sold', 'cancelled')
        or p.user_id = auth.uid()::text
        or (
          p.status = 'archived'
          and coalesce(p.metadata->>'soft_status', '') in ('deposit_hold', 'sold', 'cancelled')
        )
      )
  )
);
